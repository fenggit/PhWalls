#!/usr/bin/env node
/** Read-only R2 cover reconciliation probe. Downloads reviewed evidence locally;
 * never changes R2, D1, the frozen manifest, or the served local source tree.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { associatedOriginals } from './catalog-normalization-r2-helpers.mjs';
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const manifestPath = resolve(arg('--manifest') || 'tmp/mixed-wallpaper-2026-10-26/catalog/manifest.json');
const manifestBytes = readFileSync(manifestPath), manifest = JSON.parse(manifestBytes), hash = data => createHash('sha256').update(data).digest('hex');
const manifestHash = hash(manifestBytes), directory = resolve(arg('--out') || join(dirname(manifestPath), 'remote-cover-reconciliation'));
const journalPath = resolve(arg('--journal') || join(dirname(manifestPath), 'r2-journal.jsonl'));
const overlayPath = join(directory, 'overlay.json');mkdirSync(directory, { recursive: true });
try { process.loadEnvFile('.env.local'); } catch { /* Explicit environment is supported. */ }
const get = name => { const value = process.env[name];if (!value) throw new Error(`${name} is missing`);return value; };
const endpoint = new URL(get('R2_ENDPOINT_PROD')), bucket = get('R2_BUCKET_NAME_PROD'), access = get('R2_ACCESS_KEY_ID_PROD'), secret = get('R2_SECRET_ACCESS_KEY_PROD'), region = process.env.R2_REGION_PROD || 'auto';
const hmac = (key, value) => createHmac('sha256', key).update(value).digest();
const encode = s => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
async function request(method, key, extra = {}) {
  if (!['HEAD', 'GET'].includes(method)) throw new Error('Read-only probe');
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''), stamp = date.slice(0, 8), scope = `${stamp}/${region}/s3/aws4_request`, path = `/${encode(bucket)}/${key.split('/').map(encode).join('/')}`, payload = hash('');
  const headers = { host: endpoint.host, 'x-amz-date': date, 'x-amz-content-sha256': payload, ...extra }, names = Object.keys(headers).sort(), signed = names.join(';');
  const canonical = [method, path, '', names.map(n => `${n}:${headers[n].trim()}\n`).join(''), signed, payload].join('\n');
  const signing = hmac(hmac(hmac(hmac(`AWS4${secret}`, stamp), region), 's3'), 'aws4_request');
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${access}/${scope}, SignedHeaders=${signed}, Signature=${hmac(signing, ['AWS4-HMAC-SHA256', date, scope, hash(canonical)].join('\n')).toString('hex')}`;
  let response;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      response = await fetch(endpoint.origin + path, { method, headers, signal: AbortSignal.timeout(180000) });
      if (response.status !== 429 && response.status < 500) break;
      await response.body?.cancel();
    } catch { if (attempt === 4) throw new Error(`R2 ${method} network failure`); }
    if (attempt === 4) throw new Error(`R2 ${method} retries exhausted`);
    await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt));
  }
  if (!response.ok) { await response.body?.cancel();throw new Error(`R2 ${method} failed HTTP ${response.status}`); }
  return response;
}
async function head(key) { const r = await request('HEAD', key);return { etag: r.headers.get('etag'), size: Number(r.headers.get('content-length')), mimeType: r.headers.get('content-type') }; }
async function hashOriginal(expected, prior) {
  const info = await head(expected.source);
  if (prior?.sha256 === expected.sha256 && prior.etag === info.etag && prior.size === info.size) return { ...prior, checkedAt: new Date().toISOString(), verification: 'prior-sha256-with-current-etag-size' };
  const response = await request('GET', expected.source, { 'if-match': info.etag });
  const h = createHash('sha256');let size = 0;for await (const bytes of response.body) { h.update(bytes);size += bytes.length; }
  const sha256 = h.digest('hex');if (sha256 !== expected.sha256 || size !== info.size) throw new Error('Associated original SHA256 differs from frozen manifest');
  return { ...expected, ...info, sha256, checkedAt: new Date().toISOString() };
}
const latest = new Map();
for (const line of readFileSync(journalPath, 'utf8').split('\n').filter(Boolean)) { try { const row = JSON.parse(line);if (row.manifest_sha256 === manifestHash) latest.set(JSON.stringify([row.source, row.target ?? null]), row); } catch { /* A concurrent writer may leave a partial last line. */ } }
const previous = existsSync(overlayPath) ? JSON.parse(readFileSync(overlayPath, 'utf8')) : null;
if (previous && previous.manifest_sha256 !== manifestHash) throw new Error('Existing overlay belongs to another frozen manifest');
const entries = new Map((previous?.entries || []).map(row => [JSON.stringify([row.source, row.target]), row]));
const candidates = manifest.r2_objects.filter(object => { const row = latest.get(JSON.stringify([object.source, object.target ?? null]));return object.role === 'compress_key' && row?.failed && /R2\/local source (size|SHA256) mismatch/.test(row.error); });
const originalCache = new Map(), errors = [];let next = 0, checked = 0;
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < candidates.length) {
    const object = candidates[next++];
    try {
      const prior = entries.get(JSON.stringify([object.source, object.target]));
      const sourceInfo = await head(object.source), expected = associatedOriginals(manifest, object), originals = await Promise.all(expected.map(row => {
        const key = JSON.stringify(row);if (!originalCache.has(key)) originalCache.set(key, hashOriginal(row, prior?.originals?.find(proof => proof.source === row.source)));return originalCache.get(key);
      }));
      const response = await request('GET', object.source, { 'if-match': sourceInfo.etag }), bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length !== sourceInfo.size || bytes.length < 20 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP' || bytes.readUInt32LE(4) + 8 !== bytes.length) throw new Error('Remote cover is not a complete WebP container');
      const sha256 = hash(bytes), file = join(directory, `${sha256}.webp`);if (!existsSync(file)) writeFileSync(file, bytes);
      const row = { source: object.source, target: object.target, role: 'compress_key', reason: 'remote-cover-byte-divergence', local_before: object.local,
        local: { path: `_remote-cover-reconciliation/${sha256}.webp`, absolute_path: file, sha256, md5: createHash('md5').update(bytes).digest('hex'), size: bytes.length, detected_extension: '.webp' },
        remote: { ...sourceInfo, sha256, webpSignatureVerified: true }, originals, checkedAt: new Date().toISOString() };
      entries.set(JSON.stringify([row.source, row.target]), row);
      checked++;if (checked % 10 === 0) process.stdout.write(`Checked authoritative covers: ${checked}/${candidates.length}; verified entries: ${entries.size}\n`);
    } catch (error) { errors.push({ source: object.source, target: object.target, error: error.message }); }
  }
}));
const overlay = { version: 1, manifest_sha256: manifestHash, entries: [...entries.values()].sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target)), errors, latest_failed_cover_candidates: candidates.length, createdAt: new Date().toISOString() };
writeFileSync(overlayPath, JSON.stringify(overlay, null, 2) + '\n');
const totalBefore = overlay.entries.reduce((n, row) => n + (row.local_before?.size || 0), 0), totalAfter = overlay.entries.reduce((n, row) => n + row.local.size, 0);
writeFileSync(join(directory, 'REPORT.md'), `# Remote cover reconciliation evidence\n\nFrozen manifest: ${manifestHash}\n\nVerified authoritative covers: ${overlay.entries.length}; probe errors: ${errors.length}. Prior local cover bytes: ${totalBefore}; verified remote cover bytes: ${totalAfter}. Every entry includes a complete WebP container signature, SHA256/MD5, source ETag/size, and matching original SHA256 proof. Original proof can reuse an earlier full SHA256 only when its current ETag and size still match.\n\nByte verification does not establish which visual version is preferable. Review local/remote samples and prior cover-repair archives before selecting remote authority. The overlay changes expected cover bytes only. Old local covers remain in the local quarantine; current remote originals and covers remain intact and are copied to the R2 backup prefix. The frozen catalog manifest and business database remain unchanged by this probe. Rerun the probe after the first preparation pass to include failures logged later.\n\nApply with --evidence-overlay and the reviewed --overlay-sha256, optionally --retry-errors-only. Then run mirror-cover-overlay after apply-local to install these exact verified bytes into the canonical local targets.\n`);
process.stdout.write(JSON.stringify({ overlay: overlayPath, sha256: hash(readFileSync(overlayPath)), entries: overlay.entries.length, errors: errors.length, original_sources_checked: originalCache.size }) + '\n');
if (errors.length) process.exitCode = 1;
