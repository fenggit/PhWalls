import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { buildDeviceSeoRows, languages } from './backfill-device-seo.mjs';
import { buildLiveDeviceSeoRows } from './backfill-live-device-seo.mjs';

const fields = ['display_name', 'seo_title', 'description'];
const tables = { static: 'w_device_i18n', dynamic: 'w_live_device_i18n' };
const quote = value => value === null || value === undefined ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const missing = value => value == null || !String(value).trim();

// Audit every non-deleting collection. Published pages describe published assets;
// private collections use their actual non-deleting assets, without publishing them.
export function collectionInventory(db) {
  return Object.keys(tables).flatMap(media => db.prepare(`
    WITH active AS (
      SELECT w.* FROM w_wallpapers w JOIN w_devices d ON d.id=w.device_id
      WHERE w.media_type=? AND w.deletion_state='none' AND d.deletion_state='none'
        AND NOT EXISTS (SELECT 1 FROM w_collection_deletions c WHERE c.device_id=d.id AND c.media_type=w.media_type)
    ), counts AS (
      SELECT device_id,COUNT(*) AS active_count,SUM(status='published') AS published_count FROM active GROUP BY device_id
    )
    SELECT d.id,d.brand_name,d.device_name,d.device_slug,d.device_category,d.status,
      ? AS media_type,c.active_count,c.published_count,COUNT(*) AS wallpaper_count,
      GROUP_CONCAT(DISTINCT w.file_format) AS file_formats
    FROM w_devices d JOIN counts c ON c.device_id=d.id JOIN active w ON w.device_id=d.id
    WHERE d.status!='published' OR c.published_count=0 OR w.status='published'
    GROUP BY d.id ORDER BY d.brand_name,d.device_name
  `).all(media, media));
}

export function buildMissingSeoPlan(db, timestamp = Date.now()) {
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) throw new Error('Invalid timestamp');
  const inventory = collectionInventory(db);
  const audit = [];
  const changes = [];
  for (const device of inventory) {
    const table = tables[device.media_type];
    // Omit visual/theme/resolution claims: only names, counts, and formats are verified here.
    const generated = device.media_type === 'static' ? buildDeviceSeoRows(device) : buildLiveDeviceSeoRows(device);
    if (device.media_type === 'dynamic') {
      const formats = device.file_formats.split(',').map(value => value.toUpperCase()).sort().join('/');
      for (const row of generated) row.seo_title = row.seo_title.replaceAll('MP4', formats);
    }
    for (const copy of generated) {
      const before = db.prepare(`SELECT * FROM ${table} WHERE device_id=? AND language=?`).get(device.id, copy.language) || null;
      const missingFields = fields.filter(field => !before || missing(before[field]));
      audit.push({ device_id: device.id, brand: device.brand_name, name: device.device_name,
        media_type: device.media_type, status: device.status, language: copy.language, missing_row: !before, missing_fields: missingFields });
      if (!missingFields.length) continue;
      const after = before ? { ...before } : { id: copy.id, device_id: device.id, language: copy.language, create_date: timestamp };
      for (const field of missingFields) after[field] = copy[field];
      after.updated_date = timestamp;
      changes.push({ table, device, missing_fields: missingFields, before, after });
    }
  }
  return { timestamp, inventory, audit, changes };
}

function deviceGuard(device) {
  const media = quote(device.media_type);
  const publishedOnly = device.status === 'published' && device.published_count > 0;
  const selectedAssets = `w.device_id=${quote(device.id)} AND w.media_type=${media} AND w.deletion_state='none'${publishedOnly ? " AND w.status='published'" : ''}`;
  return `EXISTS (SELECT 1 FROM w_devices d WHERE d.id=${quote(device.id)} AND d.brand_name=${quote(device.brand_name)} AND d.device_name=${quote(device.device_name)} AND d.device_slug=${quote(device.device_slug)} AND d.status=${quote(device.status)} AND d.deletion_state='none')
    AND NOT EXISTS (SELECT 1 FROM w_collection_deletions c WHERE c.device_id=${quote(device.id)} AND c.media_type=${media})
    AND (SELECT COUNT(*) FROM w_wallpapers w WHERE ${selectedAssets})=${device.wallpaper_count}
    AND (SELECT GROUP_CONCAT(file_format,',') FROM (SELECT DISTINCT w.file_format FROM w_wallpapers w WHERE ${selectedAssets} ORDER BY w.file_format))=${quote(device.file_formats.split(',').sort().join(','))}`;
}

export function buildPlanSql(plan) {
  const apply = [];
  const rollback = [];
  for (const change of plan.changes) {
    const { table, device, before, after, missing_fields: changed } = change;
    const key = `device_id=${quote(after.device_id)} AND language=${quote(after.language)}`;
    const guard = deviceGuard(device);
    apply.push(`-- ${device.brand_name}/${device.device_slug} ${device.media_type}/${after.language}: ${changed.join(', ')}`);
    if (!before) {
      const columns = ['id', 'device_id', 'language', ...fields, 'create_date', 'updated_date'];
      apply.push(`INSERT INTO ${table} (${columns.join(',')}) SELECT ${columns.map(field => quote(after[field])).join(',')}
WHERE ${guard} ON CONFLICT (device_id,language) DO NOTHING;`);
    } else {
      // Compare each missing field to its exact snapshot value, so concurrent edits win.
      const sets = changed.map(field => `${field}=CASE WHEN ${field} IS ${quote(before[field])} THEN ${quote(after[field])} ELSE ${field} END`);
      sets.push(`updated_date=${plan.timestamp}`);
      apply.push(`UPDATE ${table} SET ${sets.join(',')}
WHERE ${key} AND id=${quote(before.id)} AND (${changed.map(field => `${field} IS ${quote(before[field])}`).join(' OR ')}) AND ${guard};`);
    }
    // Rollback only a row that still exactly matches this plan's after state.
    const exact = ['id', ...fields, 'create_date', 'updated_date'].map(field => `${field} IS ${quote(after[field])}`).join(' AND ');
    if (!before) rollback.push(`DELETE FROM ${table} WHERE ${key} AND ${exact};`);
    else rollback.push(`UPDATE ${table} SET ${[...changed, 'updated_date'].map(field => `${field}=${quote(before[field])}`).join(',')} WHERE ${key} AND ${exact} AND ${guard};`);
  }
  return { apply: `-- Missing-only SEO backfill; review before remote execution. No publication or asset changes.\n${apply.join('\n')}\n`,
    rollback: `-- Conditional rollback; later edits are preserved.\n${rollback.reverse().join('\n')}\n` };
}

export function summarizePlan(plan) {
  return Object.fromEntries(Object.keys(tables).map(media => {
    const rows = plan.audit.filter(row => row.media_type === media);
    const changed = rows.filter(row => row.missing_fields.length);
    return [media, { collections: plan.inventory.filter(row => row.media_type === media).length, audited_language_rows: rows.length,
      missing_rows: rows.filter(row => row.missing_row).length, incomplete_rows: changed.length,
      missing_fields: Object.fromEntries(fields.map(field => [field, rows.filter(row => row.missing_fields.includes(field)).length])),
      languages: Object.fromEntries(languages.map(language => [language, changed.filter(row => row.language === language).length])) }];
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = name => {
    const index = process.argv.indexOf(name);
    if (index < 0 || !process.argv[index + 1]) throw new Error('Usage: node scripts/backfill-missing-device-seo.mjs --snapshot <export.sql> --out <prefix> [--timestamp <milliseconds>]');
    return process.argv[index + 1];
  };
  const snapshot = resolve(arg('--snapshot'));
  const prefix = resolve(arg('--out'));
  const source = readFileSync(snapshot, 'utf8');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(source);
    const plan = buildMissingSeoPlan(db, process.argv.includes('--timestamp') ? Number(arg('--timestamp')) : Date.now());
    const sql = buildPlanSql(plan);
    const before = summarizePlan(plan);
    const existing = Object.values(tables).map(table => ({ table, rows: db.prepare(`SELECT * FROM ${table} ORDER BY id`).all() }));
    const afterDb = new DatabaseSync(':memory:');
    let after;
    try {
      afterDb.exec(source);
      afterDb.exec(sql.apply);
      after = summarizePlan(buildMissingSeoPlan(afterDb, plan.timestamp));
      if (Object.values(after).some(summary => summary.incomplete_rows)) throw new Error('Local simulation leaves missing fields');
      const firstApply = Object.values(tables).map(table => afterDb.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
      afterDb.exec(sql.apply);
      const secondApply = Object.values(tables).map(table => afterDb.prepare(`SELECT * FROM ${table} ORDER BY id`).all());
      if (JSON.stringify(firstApply) !== JSON.stringify(secondApply)) throw new Error('Idempotence mismatch');
      afterDb.exec(sql.rollback);
      for (const previous of existing) {
        const restored = afterDb.prepare(`SELECT * FROM ${previous.table} ORDER BY id`).all();
        if (JSON.stringify(previous.rows) !== JSON.stringify(restored)) throw new Error(`Rollback mismatch: ${previous.table}`);
      }
    } finally { afterDb.close(); }
    mkdirSync(dirname(prefix), { recursive: true });
    writeFileSync(`${prefix}.sql`, sql.apply);
    writeFileSync(`${prefix}.rollback.sql`, sql.rollback);
    writeFileSync(`${prefix}.changes.json`, JSON.stringify(plan.changes, null, 2) + '\n');
    writeFileSync(`${prefix}.inventory.json`, JSON.stringify(plan.inventory, null, 2) + '\n');
    const report = { snapshot, snapshot_sha256: createHash('sha256').update(source).digest('hex'), timestamp: plan.timestamp,
      before, after_simulated: after, changed_rows: plan.changes.length, changed_fields: plan.changes.reduce((sum, row) => sum + row.missing_fields.length, 0),
      verification: { simulation_complete: true, idempotence: true, exact_rollback: true }, missing_before: plan.audit.filter(row => row.missing_fields.length) };
    writeFileSync(`${prefix}.audit.json`, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  } finally { db.close(); }
}
