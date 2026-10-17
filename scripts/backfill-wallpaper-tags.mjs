import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const arg = (name) => {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error('Usage: --snapshot <D1.sql> --out <prefix>');
  return resolve(process.argv[index + 1]);
};
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const languages = ['en', 'zh', 'ja', 'vi', 'zh-hant'];
const dictionaries = Object.fromEntries(languages.map((language) => [language,
  JSON.parse(readFileSync(fileURLToPath(new URL(`../src/data/language/${language}/wallpaper-tags.json`, import.meta.url)), 'utf8')),
]));
const supportedTags = Object.keys(dictionaries.en);
const normalize = (value) => value.normalize('NFKC').trim().toLowerCase();
const aliases = new Map();
for (const tag of supportedTags) {
  if (tag !== normalize(tag) || tag.length > 40 || dictionaries.en[tag] !== tag) throw new Error(`Invalid lowercase English tag: ${tag}`);
  for (const dictionary of Object.values(dictionaries)) {
    if (!dictionary[tag]) throw new Error(`Missing translation: ${tag}`);
    const alias = normalize(dictionary[tag]);
    if (aliases.has(alias) && aliases.get(alias) !== tag) throw new Error(`Ambiguous translated tag: ${alias}`);
    aliases.set(alias, tag);
  }
}
for (const dictionary of Object.values(dictionaries)) {
  if (Object.keys(dictionary).length !== supportedTags.length) throw new Error('Translation dictionaries have different keys');
}
const snapshot = arg('--snapshot'), prefix = arg('--out');
const source = readFileSync(snapshot, 'utf8'), db = new DatabaseSync(':memory:');
try {
  db.exec(source);
  const beforeRows = db.prepare('SELECT * FROM w_wallpapers ORDER BY id').all();
  const changes = [], unknown = new Set(), timestamp = Date.now();
  for (const row of beforeRows) {
    const before = JSON.parse(row.tags);
    if (!Array.isArray(before) || before.some((tag) => typeof tag !== 'string' || !tag.trim())) throw new Error(`Invalid tag array: ${row.id}`);
    const keys = before.map((tag) => {
      const key = aliases.get(normalize(tag));
      if (!key) unknown.add(tag);
      return key;
    });
    const after = JSON.stringify(Array.from(new Set(keys)));
    if (row.tags !== after) {
      if (row.deletion_state !== 'none') throw new Error(`Wallpaper is being deleted: ${row.id}`);
      changes.push({ id: row.id, origin_key: row.origin_key, before: row.tags, after, updated_date: row.updated_date });
    }
  }
  if (unknown.size) throw new Error(`Complete all five translations before converting these tags: ${JSON.stringify([...unknown])}`);
  const apply = [], rollback = [];
  for (const row of changes) {
    const identity = `id=${quote(row.id)} AND origin_key=${quote(row.origin_key)}`;
    apply.push(`UPDATE w_wallpapers SET tags=${quote(row.after)},updated_date=${timestamp} WHERE ${identity} AND tags=${quote(row.before)} AND updated_date=${row.updated_date} AND deletion_state='none';`);
    rollback.push(`UPDATE w_wallpapers SET tags=${quote(row.before)},updated_date=${row.updated_date} WHERE ${identity} AND tags=${quote(row.after)} AND updated_date=${timestamp};`);
  }
  const sql = apply.join('\n') + '\n', reverse = rollback.join('\n') + '\n';
  db.exec(sql);
  const afterRows = db.prepare('SELECT * FROM w_wallpapers ORDER BY id').all();
  let tagged = 0;
  for (let index = 0; index < beforeRows.length; index++) {
    const before = beforeRows[index], after = afterRows[index];
    for (const field of Object.keys(before)) if (!['tags', 'updated_date'].includes(field) && before[field] !== after[field]) throw new Error(`Unrelated field changed: ${before.id}:${field}`);
    const keys = JSON.parse(after.tags);
    if (keys.length) tagged++;
    for (const key of keys) {
      if (!supportedTags.includes(key)) throw new Error(`Unknown stored tag: ${key}`);
      for (const labels of Object.values(dictionaries)) if (!labels[key]) throw new Error(`Missing translation: ${key}`);
    }
  }
  db.exec(sql);
  if (JSON.stringify(afterRows) !== JSON.stringify(db.prepare('SELECT * FROM w_wallpapers ORDER BY id').all())) throw new Error('Updates are not idempotent');
  db.exec(reverse);
  if (JSON.stringify(beforeRows) !== JSON.stringify(db.prepare('SELECT * FROM w_wallpapers ORDER BY id').all())) throw new Error('Rollback mismatch');
  mkdirSync(dirname(prefix), { recursive: true });
  writeFileSync(`${prefix}.sql`, sql); writeFileSync(`${prefix}.rollback.sql`, reverse);
  writeFileSync(`${prefix}.changes.json`, JSON.stringify(changes, null, 2) + '\n');
  const audit = { snapshot, snapshot_sha256: createHash('sha256').update(source).digest('hex'), timestamp,
    wallpapers: beforeRows.length, changes: changes.length, tagged, supported_tags: supportedTags.length, languages,
    dictionary_sha256: createHash('sha256').update(JSON.stringify(dictionaries)).digest('hex'),
    verification: { complete_translations: true, unchanged_other_wallpaper_fields: true, idempotent: true, exact_rollback: true },
    compatibility: 'The existing API returns the stored English strings directly; no runtime or schema changes are required.' };
  writeFileSync(`${prefix}.audit.json`, JSON.stringify(audit, null, 2) + '\n');
  console.log(JSON.stringify(audit, null, 2));
} finally { db.close(); }
