import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { languages } from './backfill-device-seo.mjs';
import { localizeDeviceName, localizeDeviceText } from './device-localization.mjs';

export function planDeviceI18nRepair(rows) {
  return rows.flatMap((row) => {
    if (!languages.includes(row.language)) throw new Error(`Unsupported language: ${row.id}`);
    const after = {
      display_name: localizeDeviceName(row.brand_name, row.display_name || row.device_name, row.language),
      seo_title: localizeDeviceText(row, row.seo_title, row.language),
      description: localizeDeviceText(row, row.description, row.language),
    };
    for (const [field, max] of [['display_name', 200], ['seo_title', 200], ['description', 5000]]) {
      if (after[field] !== null && (!after[field].trim() || after[field].length > max)) {
        throw new Error(`Invalid repaired ${field}: ${row.id}`);
      }
    }
    return Object.keys(after).some((field) => after[field] !== row[field])
      ? [{ id: row.id, device_id: row.device_id, brand_name: row.brand_name, device_name: row.device_name,
          language: row.language, before: { display_name: row.display_name, seo_title: row.seo_title,
            description: row.description, updated_date: row.updated_date }, after }]
      : [];
  });
}

const quote = (value) => value === null ? 'NULL' : `'${String(value).replaceAll("'", "''")}'`;

export function buildRepairSql(changes, timestamp = Date.now()) {
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw new Error('Invalid timestamp');
  return changes.map((row) => {
    if (!Number.isSafeInteger(row.before.updated_date)) throw new Error(`Invalid previous timestamp: ${row.id}`);
    return `UPDATE w_device_i18n SET display_name=${quote(row.after.display_name)},
seo_title=${quote(row.after.seo_title)},description=${quote(row.after.description)},updated_date=${timestamp}
WHERE id=${quote(row.id)} AND device_id=${quote(row.device_id)} AND language=${quote(row.language)}
AND display_name IS ${quote(row.before.display_name)} AND seo_title IS ${quote(row.before.seo_title)}
AND description IS ${quote(row.before.description)} AND updated_date=${row.before.updated_date}
AND EXISTS (SELECT 1 FROM w_devices WHERE id=${quote(row.device_id)}
  AND brand_name=${quote(row.brand_name)} AND device_name=${quote(row.device_name)});`;
  }).join('\n') + '\n';
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = (name) => process.argv[process.argv.indexOf(name) + 1];
  if (!process.argv.includes('--snapshot') || !process.argv.includes('--out')) {
    throw new Error('Usage: node scripts/repair-device-i18n.mjs --snapshot <D1-export.sql> --out <file-prefix>');
  }
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync(arg('--snapshot'), 'utf8'));
    const rows = db.prepare(`SELECT i.*, d.device_name, d.brand_name
      FROM w_device_i18n i JOIN w_devices d ON d.id=i.device_id ORDER BY i.id`).all();
    const changes = planDeviceI18nRepair(rows);
    const prefix = resolve(arg('--out'));
    mkdirSync(dirname(prefix), { recursive: true });
    writeFileSync(`${prefix}.json`, JSON.stringify(changes, null, 2) + '\n');
    writeFileSync(`${prefix}.sql`, buildRepairSql(changes));
    console.log(JSON.stringify({ inspected: rows.length, changes: changes.length,
      languages: Object.fromEntries(languages.map(language => [language, changes.filter(row => row.language === language).length])),
      output: prefix }));
  } finally { db.close(); }
}
