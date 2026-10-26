#!/usr/bin/env node
/** Prepare recoverable R2 copies for a reviewed catalog manifest.
 * Never deletes source objects. After this succeeds, apply the guarded D1 SQL
 * and export/read back affected rows before considering separate source cleanup.
 * Usage: node scripts/catalog-normalization-r2.mjs --manifest <path> [--apply]
 * --apply authorizes object copies; default only prints counts without network.
 */
import { readFileSync, appendFileSync, mkdirSync, writeFileSync, existsSync, createReadStream, statSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { reusableEvidence, associatedOriginals, matchingOriginalReceipt } from './catalog-normalization-r2-helpers.mjs';
const arg = name => { const i = process.argv.indexOf(name); return i < 0 ? null : process.argv[i + 1]; };
const manifestPath = resolve(arg('--manifest') || 'tmp/mixed-wallpaper-2026-10-26/catalog/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const manifestHash = createHash('sha256').update(readFileSync(manifestPath)).digest('hex');
const concurrency = Math.max(1, Math.min(96, Number(arg('--concurrency') || 64)));
if (!Number.isInteger(concurrency)) throw new Error('Invalid concurrency');
const objects = manifest.r2_objects.map(row => ({ ...row }));
const checkOriginProofsOnly = process.argv.includes('--check-origin-proofs');
const retryErrorsOnly = process.argv.includes('--retry-errors-only');
const coverAuthorityChoice = arg('--cover-authority') || 'remote';
if (!['local','remote'].includes(coverAuthorityChoice)) throw new Error('Invalid cover authority');
const overlayPath = arg('--evidence-overlay') ? resolve(arg('--evidence-overlay')) : null;
let overlayHash = null, overlayEntries = 0;
const originalReceipts = new Map();
if (overlayPath) {
  const bytes = readFileSync(overlayPath), overlay = JSON.parse(bytes);overlayHash = createHash('sha256').update(bytes).digest('hex');
  if (arg('--overlay-sha256') && arg('--overlay-sha256') !== overlayHash) throw new Error('Cover overlay SHA256 differs from reviewed value');
  if (overlay.manifest_sha256 !== manifestHash || overlay.errors?.length) throw new Error('Cover overlay is not verified for this frozen manifest');
  const seen = new Set();
  for (const entry of overlay.entries) {
    for (const proof of entry.originals || []) originalReceipts.set(proof.source, proof);
    const key = JSON.stringify([entry.source, entry.target]);if (seen.has(key)) throw new Error('Duplicate cover overlay entry');seen.add(key);
    const object = objects.find(row => row.source === entry.source && row.target === entry.target && row.role === 'compress_key');
    if (!object || entry.role !== 'compress_key' || !entry.remote?.webpSignatureVerified) throw new Error('Overlay can only reconcile measured WebP covers');
    if (coverAuthorityChoice === 'local') {
      if (entry.authority !== 'local' || !object.local || entry.local.sha256 !== object.local.sha256 || entry.local.size !== object.local.size) throw new Error('Local authority must retain the reviewed frozen local cover');
      if (!entry.remote_local || entry.remote_local.sha256 !== entry.remote.sha256 || createHash('sha256').update(readFileSync(entry.remote_local.absolute_path)).digest('hex') !== entry.remote.sha256) throw new Error('Measured old remote cover evidence changed');
      if (!object.target || object.target === object.source) throw new Error('Local authority requires a new canonical target, preserving the old source');
    } else if (entry.remote.sha256 !== entry.local.sha256) throw new Error('Remote authority SHA256 differs from staged bytes');
    const expected = associatedOriginals(manifest, object), proved = entry.originals.map(row => ({ source: row.source, sha256: row.sha256 })).sort((a, b) => a.source.localeCompare(b.source));
    if (JSON.stringify(expected) !== JSON.stringify(proved)) throw new Error('Cover overlay does not prove every original owner');
    if (createHash('sha256').update(readFileSync(entry.local.absolute_path || resolve(manifest.source, entry.local.path))).digest('hex') !== entry.local.sha256) throw new Error('Staged authoritative cover bytes changed');
    object.local = entry.local;object.coverAuthority = entry;object.coverAuthorityChoice = coverAuthorityChoice;object.mime_type = 'image/webp';overlayEntries++;
  }
}
const backupPrefix = `_catalog-backups/${manifest.snapshot_sha256.slice(0, 16)}`;
const journalPath = resolve(dirname(manifestPath), 'r2-journal.jsonl');
const reportPath = resolve(dirname(manifestPath), 'r2-ready.json');
if (!process.argv.includes('--apply') && !checkOriginProofsOnly) {
  process.stdout.write(JSON.stringify({ objects: objects.length, backupPrefix, sourceDeletion: false, apply: false }) + '\n');
  process.exit(0);
}
try { process.loadEnvFile('.env.local'); } catch { /* Explicit environment may be provided. */ }
const get = name => { const value = process.env[name]; if (!value) throw new Error(`${name} is missing`); return value; };
const endpoint = new URL(get('R2_ENDPOINT_PROD')), bucket = get('R2_BUCKET_NAME_PROD');
const access = get('R2_ACCESS_KEY_ID_PROD'), secret = get('R2_SECRET_ACCESS_KEY_PROD');
const region = process.env.R2_REGION_PROD || 'auto';
const hash = data => createHash('sha256').update(data).digest('hex');
const hmac = (key, value) => createHmac('sha256', key).update(value).digest();
const encode = s => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const keyPath = key => `/${encode(bucket)}/${key.split('/').map(encode).join('/')}`;
async function request(method, key, extra = {}, bodyFactory = null, payloadHash = null) {
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''), stamp = date.slice(0, 8);
  const scope = `${stamp}/${region}/s3/aws4_request`, path = keyPath(key), payload = payloadHash || hash('');
  const headers = { host: endpoint.host, 'x-amz-date': date, 'x-amz-content-sha256': payload, ...extra };
  const names = Object.keys(headers).sort(), signed = names.join(';');
  const canonical = [method, path, '', names.map(n => `${n}:${headers[n].trim()}\n`).join(''), signed, payload].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secret}`, stamp), region), 's3'), 'aws4_request');
  const signature = hmac(signingKey, ['AWS4-HMAC-SHA256', date, scope, hash(canonical)].join('\n')).toString('hex');
  headers.authorization = `AWS4-HMAC-SHA256 Credential=${access}/${scope}, SignedHeaders=${signed}, Signature=${signature}`;
  // Never include URLs, authorization headers or remote response bodies in errors.
  let response;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      response = await fetch(endpoint.origin + path, { method, headers, signal: AbortSignal.timeout(180000),
        ...(bodyFactory ? { body: bodyFactory(), duplex: 'half' } : {}) });
      if (response.status !== 429 && response.status < 500) break;
      await response.body?.cancel();
    } catch (error) { if (attempt === 4) throw new Error(`R2 ${method} network failure`); }
    if (attempt === 4) throw new Error(`R2 ${method} transient failure after retries`);
    await new Promise(resolve => setTimeout(resolve, Math.min(8000, 500 * 2 ** attempt) + Math.random() * 300));
  }
  if (!response.ok && response.status !== 404 && !(bodyFactory && response.status === 412)) { await response.body?.cancel(); throw new Error(`R2 ${method} failed: HTTP ${response.status}`); }
  return response;
}
async function head(key) {
  const r = await request('HEAD', key);
  return r.status === 404 ? null : { size: Number(r.headers.get('content-length')), etag: r.headers.get('etag'), mimeType: r.headers.get('content-type') };
}
async function sha256(key, etag) {
  const response = await request('GET', key, etag ? { 'if-match': etag } : {});
  if (response.status === 404) throw new Error('R2 object disappeared during verification');
  const h = createHash('sha256'); for await (const bytes of response.body) h.update(bytes); return h.digest('hex');
}
const multipartProofs = new Map();
async function localMultipartProof(object, info) {
  const etag = info.etag?.replaceAll('"', '').toLowerCase(), match = etag?.match(/^([a-f\d]{32})-(\d+)$/);
  if (object.role !== 'origin_key' || !object.local || !match) return null;
  const count = Number(match[2]), sizes = [5, 8, 16, 32, 64, 100].map(n => n * 1024 * 1024).filter(size => Math.ceil(info.size / size) === count);
  if (!sizes.length) return null;
  const local = object.local, path = local.absolute_path || resolve(manifest.source, local.path), stat = statSync(path);
  if (stat.size !== local.size) throw new Error('Multipart proof local size differs from frozen manifest');
  const key = JSON.stringify([path, stat.size, stat.mtimeMs, stat.ctimeMs, local.sha256, sizes]);
  if (!multipartProofs.has(key)) multipartProofs.set(key, (async () => {
    const whole = createHash('sha256'), wholeMD5 = createHash('md5'), states = sizes.map(partSize => ({ partSize, used: 0, digest: createHash('md5'), parts: [] }));
    for await (const chunk of createReadStream(path, { highWaterMark: 1024 * 1024 })) {
      whole.update(chunk);wholeMD5.update(chunk);
      for (const state of states) {
        let offset = 0;
        while (offset < chunk.length) {
          const length = Math.min(chunk.length - offset, state.partSize - state.used);state.digest.update(chunk.subarray(offset, offset + length));state.used += length;offset += length;
          if (state.used === state.partSize) { state.parts.push(state.digest.digest());state.digest = createHash('md5');state.used = 0; }
        }
      }
    }
    const sha256 = whole.digest('hex'), md5 = wholeMD5.digest('hex');
    if (sha256 !== local.sha256 || (local.md5 && md5 !== local.md5)) throw new Error('Multipart proof local SHA256/MD5 differs from frozen manifest');
    return states.map(state => { if (state.used) state.parts.push(state.digest.digest());return { kind: 'multipart-etag', partSize: state.partSize, etag: createHash('md5').update(Buffer.concat(state.parts)).digest('hex') + '-' + state.parts.length, sha256, wholeFileMD5: md5, size: stat.size }; });
  })());
  return (await multipartProofs.get(key)).find(proof => proof.etag === etag) || null;
}
async function verifySource(object, info) {
  if (!info) throw new Error('R2 source missing');
  const local = object.local;
  if (local && info.size !== local.size) throw new Error('R2/local source size mismatch');
  if (local && info.etag?.replaceAll('"', '').toLowerCase() === local.md5) { object.sourceVerification = { kind: 'single-part-etag', etag: info.etag, size: info.size, sha256: local.sha256 };return local.sha256; }
  const receipt = originalReceipts.get(object.source);
  if (matchingOriginalReceipt(object, info, receipt)) { object.sourceVerification = { kind: 'overlay-full-sha256-receipt', etag: info.etag, size: info.size, sha256: local.sha256, overlaySHA256: overlayHash };return local.sha256; }
  const multipart = await localMultipartProof(object, info);
  if (multipart) { object.sourceVerification = multipart;return local.sha256; }
  const measured = await sha256(object.source, info.etag);
  if (local && measured !== local.sha256) throw new Error('R2/local source SHA256 mismatch');
  object.sourceVerification = { kind: 'full-get-sha256', etag: info.etag, size: info.size, sha256: measured };
  return measured;
}
async function copyVerified(source, target, sourceInfo, sourceHash, mimeType = null, expectedLocalMD5 = null) {
  let targetInfo = await head(target);
  const matchesKnownMD5 = info => Boolean(info && info.size === sourceInfo.size && /^[a-f\d]{32}$/i.test(expectedLocalMD5 || '') && info.etag?.replaceAll('"', '').toLowerCase() === expectedLocalMD5.toLowerCase());
  if (targetInfo && mimeType && targetInfo.mimeType !== mimeType) {
    if (targetInfo.size !== sourceInfo.size || (!matchesKnownMD5(targetInfo) && await sha256(target, targetInfo.etag) !== sourceHash)) throw new Error('Occupied R2 target content differs');
  }
  if (!targetInfo || (mimeType && targetInfo.mimeType !== mimeType)) {
    const r = await request('PUT', target, { 'x-amz-copy-source': keyPath(source), 'x-amz-copy-source-if-match': sourceInfo.etag,
      ...(mimeType ? { 'x-amz-metadata-directive': 'REPLACE', 'content-type': mimeType } : {}) });
    const body = await r.text(); if (body.includes('<Error>')) throw new Error('R2 copy returned an embedded error');
    targetInfo = await head(target);
  }
  if (!targetInfo || targetInfo.size !== sourceInfo.size || (mimeType && targetInfo.mimeType !== mimeType)) throw new Error('R2 copy size mismatch');
  // Equal single-part ETags prove byte equality. Multipart copies need a full hash.
  const a = sourceInfo.etag?.replaceAll('"', ''), b = targetInfo.etag?.replaceAll('"', '');
  if (!(a && /^[a-f\d]{32}$/i.test(a) && a === b) && !matchesKnownMD5(targetInfo) && await sha256(target, targetInfo.etag) !== sourceHash) throw new Error('R2 target SHA256 mismatch');
  return targetInfo;
}
async function verifiedLocal(object) {
  const local = object.local;
  if (!local) throw new Error('R2 source missing without matching local evidence');
  const path = local.absolute_path || resolve(manifest.source, local.path);
  if (statSync(path).size !== local.size) throw new Error('Recovery local size differs from manifest');
  const h = createHash('sha256'); for await (const bytes of createReadStream(path)) h.update(bytes);
  if (h.digest('hex') !== local.sha256) throw new Error('Recovery local SHA256 differs from manifest');
  return { path, local };
}
async function localTarget(key, evidence, mimeType) {
  const { path, local } = evidence;
  let info = await head(key);
  if (!info) {
    const response = await request('PUT', key, { 'content-type': mimeType, 'content-length': String(local.size), 'if-none-match': '*' }, () => createReadStream(path), local.sha256);
    await response.body?.cancel();info = await head(key);
  }
  if (!info || info.size !== local.size) throw new Error('Recovered R2 target size mismatch');
  if (!(info.etag?.replaceAll('"', '').toLowerCase() === local.md5) && await sha256(key, info.etag) !== local.sha256) throw new Error('Occupied recovery target SHA256 differs');
  if (mimeType && info.mimeType !== mimeType) info = await copyVerified(key, key, info, local.sha256, mimeType);
  return info;
}
mkdirSync(dirname(journalPath), { recursive: true });
const completed = []; let next = 0, trustedSuccesses = 0;
const authorityOriginals = new Map();
async function verifyAuthorityOriginals(object) {
  if (!object.coverAuthority) return;
  object.validatedAuthorityOriginals = await Promise.all(object.coverAuthority.originals.map(proof => {
    const key = JSON.stringify([proof.source, proof.sha256]);
    if (!authorityOriginals.has(key)) authorityOriginals.set(key, (async () => {
      const current = await head(proof.source);if (!current) throw new Error('Authoritative cover original disappeared');
      if ((current.etag !== proof.etag || current.size !== proof.size) && await sha256(proof.source, current.etag) !== proof.sha256) throw new Error('Authoritative cover original SHA256 changed');
      return { source: proof.source, sha256: proof.sha256, etag: current.etag, size: current.size };
    })());
    return authorityOriginals.get(key);
  }));
}
const resumed = new Map(), latestForManifest = new Map();
if (existsSync(journalPath)) {
  for (const line of readFileSync(journalPath, 'utf8').split('\n').filter(Boolean)) {
    try {
      const row = JSON.parse(line);
      if (row.manifest_sha256 === manifestHash) latestForManifest.set(JSON.stringify([row.source, row.target ?? null]), row);
      if (!row.failed && !row.optionalMissing) {
        const key = JSON.stringify([row.source, row.target ?? null]);
        const entries = resumed.get(key) || [];entries.push(row);resumed.set(key, entries);
      }
    } catch { /* Ignore an interrupted final journal line. */ }
  }
}
if (checkOriginProofsOnly) {
  const selected = objects.filter(object => object.role === 'origin_key' && latestForManifest.get(JSON.stringify([object.source, object.target ?? null]))?.failed), results = [];let index = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (index < selected.length) {
      const object = selected[index++];
      try {
        const [info, backupInfo, targetInfo] = await Promise.all([head(object.source), head(`${backupPrefix}/${object.source}`), object.target ? head(object.target) : null]);
        if (!info || !object.local || info.size !== object.local.size) throw new Error('Missing/mismatched original metadata');
        let proof;
        if (info.etag?.replaceAll('"', '').toLowerCase() === object.local.md5) proof = { kind: 'single-part-etag', sha256: object.local.sha256, etag: info.etag, size: info.size };
        else if (matchingOriginalReceipt(object, info, originalReceipts.get(object.source))) proof = { kind: 'overlay-full-sha256-receipt', ...originalReceipts.get(object.source) };
        else proof = await localMultipartProof(object, info);
        if (!proof) throw new Error('No exact local multipart/single-part or receipt proof; full source GET remains required');
        const copied = value => Boolean(value && value.size === object.local.size && value.etag?.replaceAll('"', '').toLowerCase() === object.local.md5);
        results.push({ source: object.source, proof, backupKnownWholeMD5: copied(backupInfo), targetKnownWholeMD5: copied(targetInfo) });
      } catch (error) { results.push({ source: object.source, error: error.message }); }
    }
  }));
  const audit = { manifest_sha256: manifestHash, operations: selected.length, proved: results.filter(row => row.proof).length, results };
  writeFileSync(resolve(dirname(manifestPath), 'origin-proof-audit.json'), JSON.stringify(audit, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ operations: audit.operations, proved: audit.proved, backupMD5Matches: results.filter(row => row.backupKnownWholeMD5).length, targetMD5Matches: results.filter(row => row.targetKnownWholeMD5).length, errors: results.filter(row => row.error) }) + '\n');
  process.exit(audit.proved === audit.operations ? 0 : 1);
}
const errors = [];
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (next < objects.length) {
    const object = objects[next++];
    try {
      const entries = resumed.get(JSON.stringify([object.source, object.target ?? null])) || [];
      const prior = [...entries].reverse().find(row => reusableEvidence(object, row) && (object.coverAuthorityChoice !== 'local' || (row.cover_authority === 'local' && row.coverAuthorityOverlaySHA256 === overlayHash && row.source_sha256 === object.coverAuthority.remote.sha256 && row.backup_sha256 === row.source_sha256 && row.target_sha256 === object.local.sha256)));
      const latest = latestForManifest.get(JSON.stringify([object.source, object.target ?? null]));
      if (retryErrorsOnly && latest?.optionalMissing && object.optional && !object.local) { completed.push(latest);trustedSuccesses++;continue; }
      if (retryErrorsOnly && prior?.manifest_sha256 === manifestHash && prior.verifiedAt && !latest?.failed) {
        completed.push(prior);trustedSuccesses++;continue;
      }
      await verifyAuthorityOriginals(object);
      if (prior) {
        const [source, backup, target] = await Promise.all([head(object.source), head(prior.backup), object.target ? head(object.target) : null]);
        const sourceValid = prior.recoveredFromLocal ? !source || (source.etag === prior.sourceInfo?.etag && source.size === prior.sourceInfo?.size) : source?.etag === prior.sourceInfo.etag && source.size === prior.sourceInfo.size;
        const expectedSize = object.local?.size ?? prior.targetInfo?.size ?? prior.sourceInfo?.size ?? prior.backupInfo.size;
        const expectedBackupSize = prior.cover_authority === 'local' ? prior.sourceInfo.size : expectedSize;
        if (sourceValid && backup?.etag === prior.backupInfo.etag && backup.size === expectedBackupSize && (!object.target || (target?.etag === prior.targetInfo.etag && target.size === expectedSize && (!object.mime_type || target.mimeType === object.mime_type)))) {
          const row = { ...prior, manifest_sha256: manifestHash, resumedAt: new Date().toISOString() };completed.push(row);appendFileSync(journalPath, JSON.stringify(row) + '\n');continue;
        }
      }
      const sourceInfo = await head(object.source);
      if (!sourceInfo && object.optional && !object.local) {
        const row = { source: object.source, target: object.target, optionalMissing: true, manifest_sha256: manifestHash };completed.push(row);appendFileSync(journalPath, JSON.stringify(row) + '\n');continue;
      }
      const backup = `${backupPrefix}/${object.source}`;
      let sourceHash, targetHash, backupInfo, targetInfo, recoveredFromLocal = false;
      if (object.coverAuthorityChoice === 'local') {
        if (!sourceInfo) throw new Error('Measured remote cover source disappeared before backup');
        const proof = object.coverAuthority.remote;
        sourceHash = sourceInfo.etag === proof.etag && sourceInfo.size === proof.size ? proof.sha256 : await sha256(object.source, sourceInfo.etag);
        if (sourceHash !== proof.sha256) throw new Error('Measured remote cover SHA256 changed');
        const local = await verifiedLocal(object);targetHash = local.local.sha256;
        [backupInfo, targetInfo] = await Promise.all([copyVerified(object.source, backup, sourceInfo, sourceHash), localTarget(object.target, local, object.mime_type)]);
      } else if (sourceInfo) {
        sourceHash = await verifySource(object, sourceInfo);
        const expectedLocalMD5 = object.local && sourceHash === object.local.sha256 ? object.local.md5 : null;
        [backupInfo, targetInfo] = await Promise.all([
          copyVerified(object.source, backup, sourceInfo, sourceHash, null, expectedLocalMD5),
          object.target ? copyVerified(object.source, object.target, sourceInfo, sourceHash, object.mime_type, expectedLocalMD5) : null,
        ]);
      } else {
        const local = await verifiedLocal(object);sourceHash = local.local.sha256;recoveredFromLocal = true;
        const mimeType = object.mime_type || (local.local.detected_extension === '.webp' ? 'image/webp' : 'application/octet-stream');
        [backupInfo, targetInfo] = await Promise.all([localTarget(backup, local, mimeType), object.target ? localTarget(object.target, local, mimeType) : null]);
      }
      targetHash ||= sourceHash;
      const row = { manifest_sha256: manifestHash, source: object.source, target: object.target, backup, sha256: targetHash, source_sha256: sourceHash, backup_sha256: sourceHash, target_sha256: targetHash, mime_type: object.mime_type || null,
        sourceInfo, backupInfo, targetInfo, recoveredFromLocal, ...(object.sourceVerification ? { sourceVerification: object.sourceVerification } : {}), ...(object.coverAuthority ? { coverAuthorityOverlaySHA256: overlayHash, authoritativeCoverSHA256: object.local.sha256, cover_authority: object.coverAuthorityChoice, authority_originals: object.validatedAuthorityOriginals } : {}), ...(recoveredFromLocal ? { recoveryLocalPath: object.local.path, recoveryLocalSHA256: object.local.sha256 } : {}), verifiedAt: new Date().toISOString() };
      appendFileSync(journalPath, JSON.stringify(row) + '\n');completed.push(row);
      if (completed.length % 100 === 0) process.stdout.write(`Verified R2 objects: ${completed.length}/${objects.length}\n`);
    } catch (error) {
      const row = { manifest_sha256: manifestHash, source: object.source, target: object.target, error: error.message };errors.push(row);appendFileSync(journalPath, JSON.stringify({ ...row, failed: true }) + '\n');
    }
  }
}));
const report = { manifest_sha256: hash(readFileSync(manifestPath)), backupPrefix, expected: objects.length, verified: completed.length, errors, sourceDeletion: false, trustedSuccesses, retryErrorsOnly, evidenceOverlay: overlayPath ? { path: overlayPath, sha256: overlayHash, entries: overlayEntries, authority: coverAuthorityChoice } : null };
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify({ expected: report.expected, verified: report.verified, errors: errors.length, sourceDeletion: false }) + '\n');
if (errors.length) process.exitCode = 1;
