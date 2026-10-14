import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { open } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createTsLoader } from './tests/load-ts.mjs';

const quote = value => value == null ? 'NULL' : typeof value === 'number' ? String(value) : `'${value.replaceAll("'", "''")}'`;
export function dimensionSql(changes, timestamp) {
  const apply = [], rollback = [];
  for (const { before, after } of changes) {
    if (![after.width, after.height, after.size_bytes].every(value => Number.isSafeInteger(value) && value > 0)) {
      throw new Error('Invalid measured original metadata');
    }
    if ((before.width > 0 && before.width !== after.width) || (before.height > 0 && before.height !== after.height)) {
      throw new Error(`Existing dimension disagrees with original: ${before.id}`);
    }
    const identity = `id=${quote(before.id)} AND origin_key=${quote(before.origin_key)}`;
    apply.push(`UPDATE w_wallpapers SET width=${after.width},height=${after.height},size_bytes=${after.size_bytes},updated_date=${timestamp}
WHERE ${identity} AND width IS ${quote(before.width)} AND height IS ${quote(before.height)} AND size_bytes=${before.size_bytes}
AND updated_date=${before.updated_date} AND deletion_state='none' AND (width IS NULL OR height IS NULL);`);
    rollback.push(`UPDATE w_wallpapers SET width=${quote(before.width)},height=${quote(before.height)},size_bytes=${before.size_bytes},updated_date=${before.updated_date}
WHERE ${identity} AND width=${after.width} AND height=${after.height} AND size_bytes=${after.size_bytes} AND updated_date=${timestamp};`);
  }
  return { apply: apply.join('\n') + '\n', rollback: rollback.join('\n') + '\n' };
}

function originalFiles(root, bySize) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(root, entry.name);
    if (entry.name.toLowerCase() === 'origin') {
      for (const file of readdirSync(path, { withFileTypes: true })) {
        if (!file.isFile()) continue;
        const filePath = join(path, file.name), size = statSync(filePath).size;
        const paths = bySize.get(size) || []; paths.push(filePath); bySize.set(size, paths);
      }
    } else if (entry.name !== 'data' && !entry.name.startsWith('.')) originalFiles(path, bySize);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = name => {
    const index = process.argv.indexOf(name);
    if (index < 0 || !process.argv[index + 1]) throw new Error('Usage: --snapshot <D1.sql> --source <local assets> --out <prefix>');
    return process.argv[index + 1];
  };
  try { process.loadEnvFile('.env.local'); } catch { /* Cloudflare credentials may already be set by the caller. */ }
  const snapshot = resolve(arg('--snapshot')), assetRoot = resolve(arg('--source')), prefix = resolve(arg('--out'));
  const sourceSql = readFileSync(snapshot, 'utf8'), db = new DatabaseSync(':memory:');
  try {
    db.exec(sourceSql);
    const beforeRows = db.prepare("SELECT * FROM w_wallpapers WHERE deletion_state='none' AND (width IS NULL OR height IS NULL) ORDER BY origin_key").all();
    const bySize = new Map(); originalFiles(assetRoot, bySize);
    const load = createTsLoader({ '@cloudflare/next-on-pages': { getOptionalRequestContext: () => undefined } });
    const { headR2Object } = load('src/lib/r2-upload.ts');
    const { readR2OriginMetadata } = load('src/lib/admin-origin-metadata.ts');
    const { readOriginalDimensions } = load('src/lib/original-media-metadata.ts');
    const changes = [], errors = [];
    let next = 0;
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (next < beforeRows.length) {
        const before = beforeRows[next++];
        try {
          const info = await headR2Object(before.origin_key);
          if (!info) throw new Error('R2 original missing');
          let local;
          const etag = info.etag?.replaceAll('"', '').toLowerCase();
          if (etag && /^[a-f0-9]{32}$/.test(etag)) {
            const candidates = [...(bySize.get(info.size) || [])].sort((a, b) =>
              Number(basename(b) === basename(before.origin_key)) - Number(basename(a) === basename(before.origin_key)));
            local = candidates.find(path => createHash('md5').update(readFileSync(path)).digest('hex') === etag);
          }
          let measured;
          if (local) {
            const file = await open(local, 'r');
            try {
              measured = await readOriginalDimensions({ size: info.size, async read(start, length) {
                const bytes = new Uint8Array(length);
                const { bytesRead } = await file.read(bytes, 0, length, start);
                return bytes.subarray(0, bytesRead);
              } }, before.mime_type);
            } finally { await file.close(); }
          } else measured = await readR2OriginMetadata(before.origin_key, { ...info, mimeType: before.mime_type });
          changes.push({ before, after: { width: measured.width, height: measured.height, size_bytes: info.size },
            evidence: { source: local ? 'local-original-matched-r2-etag' : 'r2-original-header', path: local || null, etag: info.etag || null } });
        } catch (error) { errors.push({ id: before.id, origin_key: before.origin_key, error: error.message }); }
      }
    }));
    changes.sort((a, b) => a.before.origin_key.localeCompare(b.before.origin_key));
    const timestamp = Date.now(), sql = dimensionSql(changes, timestamp);
    const originalRows = db.prepare('SELECT * FROM w_wallpapers ORDER BY id').all();
    db.exec(sql.apply);
    const afterRows = db.prepare('SELECT * FROM w_wallpapers ORDER BY id').all();
    const missingAfter = db.prepare("SELECT COUNT(*) AS count FROM w_wallpapers WHERE deletion_state='none' AND (width IS NULL OR height IS NULL)").get().count;
    db.exec(sql.apply);
    if (JSON.stringify(afterRows) !== JSON.stringify(db.prepare('SELECT * FROM w_wallpapers ORDER BY id').all())) throw new Error('SQL is not idempotent');
    db.exec(sql.rollback);
    if (JSON.stringify(originalRows) !== JSON.stringify(db.prepare('SELECT * FROM w_wallpapers ORDER BY id').all())) throw new Error('Rollback mismatch');
    mkdirSync(dirname(prefix), { recursive: true });
    writeFileSync(`${prefix}.sql`, sql.apply); writeFileSync(`${prefix}.rollback.sql`, sql.rollback);
    writeFileSync(`${prefix}.changes.json`, JSON.stringify(changes, null, 2) + '\n');
    const audit = { snapshot, source: assetRoot, timestamp, snapshot_sha256: createHash('sha256').update(sourceSql).digest('hex'),
      missing_before: beforeRows.length, verified: changes.length, missing_after_simulation: missingAfter,
      local_originals: changes.filter(row => row.evidence.path).length, r2_originals: changes.filter(row => !row.evidence.path).length,
      corrected_byte_sizes: changes.filter(row => row.before.size_bytes !== row.after.size_bytes).length,
      verification: { idempotent: true, exact_rollback: true }, errors };
    writeFileSync(`${prefix}.audit.json`, JSON.stringify(audit, null, 2) + '\n');
    console.log(JSON.stringify(audit, null, 2));
    if (errors.length) process.exitCode = 1;
  } finally { db.close(); }
}
