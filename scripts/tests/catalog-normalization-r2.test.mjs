import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { reusableEvidence, matchingOriginalReceipt } from '../catalog-normalization-r2-helpers.mjs';
const sha = data => createHash('sha256').update(data).digest('hex');
const md5 = data => createHash('md5').update(data).digest('hex');
const run = (manifest, env, extra = []) => new Promise((done, reject) => {
  const child = spawn(process.execPath, ['scripts/catalog-normalization-r2.mjs', '--manifest', manifest, '--apply', '--concurrency', '4', ...extra], { cwd: resolve('.'), env: { ...process.env, ...env } });
  let output = '';child.stdout.on('data', b => output += b);child.stderr.on('data', b => output += b);child.on('error', reject);child.on('close', code => done({ code, output }));
});
test('journal reuse requires the same source, target, content hash and MIME', () => {
  const object = { source: 'a', target: 'b', local: { sha256: 'a'.repeat(64) }, mime_type: 'image/webp' };
  const row = { source: 'a', target: 'b', sha256: 'a'.repeat(64), mime_type: 'image/webp' };
  assert.equal(reusableEvidence(object, row), true);
  for (const changed of [{ source: 'x' }, { target: 'x' }, { sha256: 'b'.repeat(64) }, { mime_type: 'image/png' }]) assert.equal(reusableEvidence(object, { ...row, ...changed }), false);
});
test('original SHA receipts require exact role, frozen hash, current ETag and size', () => {
  const object = { role: 'origin_key', local: { sha256: 'a'.repeat(64), size: 10 } }, info = { etag: '"part-2"', size: 10 }, receipt = { sha256: 'a'.repeat(64), etag: '"part-2"', size: 10 };
  assert.equal(matchingOriginalReceipt(object, info, receipt), true);
  assert.equal(matchingOriginalReceipt({ ...object, role: 'compress_key' }, info, receipt), false);
  assert.equal(matchingOriginalReceipt(object, { ...info, etag: '"changed-2"' }, receipt), false);
  assert.equal(matchingOriginalReceipt(object, { ...info, size: 11 }, receipt), false);
  assert.equal(matchingOriginalReceipt(object, info, { ...receipt, sha256: 'b'.repeat(64) }), false);
});
test('missing objects recover from signed conditional local PUTs; fanout and revised-manifest resume preserve bytes', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'catalog-r2-test-'));
  const bytes = Buffer.from('verified local preview bytes'), legacy = Buffer.from('legacy existing bytes');
  writeFileSync(join(folder, 'cover.webp'), bytes);
  const objects = new Map([['legacy.webp', { bytes: legacy, mime: 'image/webp' }]]);let writes = 0;let uploadCount = 0;const headCounts = new Map(), getCounts = new Map();
  const server = createServer(async (req, res) => {
    const key = decodeURIComponent(req.url.slice('/bucket/'.length));const existing = objects.get(key);
    const reply = item => { res.setHeader('etag', `"${item.etag || md5(item.bytes)}"`);res.setHeader('content-length', String(item.bytes.length));res.setHeader('content-type', item.mime); };
    if (req.method === 'HEAD') { headCounts.set(key, (headCounts.get(key) || 0) + 1);if (!existing) { res.statusCode = 404;res.end();return; }reply(existing);res.end();return; }
    if (req.method === 'GET') { getCounts.set(key, (getCounts.get(key) || 0) + 1);if (!existing) { res.statusCode = 404;res.end();return; }reply(existing);res.end(existing.bytes);return; }
    if (req.method !== 'PUT') { res.statusCode = 405;res.end();return; }
    writes++;
    const copy = req.headers['x-amz-copy-source'];
    if (copy) {
      const source = objects.get(decodeURIComponent(copy.slice('/bucket/'.length)));
      if (!source) { res.statusCode = 404;res.end();return; }
      assert.equal(req.headers['x-amz-copy-source-if-match'], `"${source.etag || md5(source.bytes)}"`);
      objects.set(key, { bytes: Buffer.from(source.bytes), mime: req.headers['content-type'] || source.mime });res.end('<CopyObjectResult/>');return;
    }
    uploadCount++;
    assert.equal(req.headers['if-none-match'], '*');assert.match(req.headers.authorization, /if-none-match/);
    if (existing) { res.statusCode = 412;res.end();return; }
    const chunks = [];for await (const chunk of req) chunks.push(chunk);const body = Buffer.concat(chunks);
    assert.equal(req.headers['x-amz-content-sha256'], sha(body));assert.equal(Number(req.headers['content-length']), body.length);
    objects.set(key, { bytes: body, mime: req.headers['content-type'] });res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  const env = { R2_ENDPOINT_PROD: endpoint, R2_BUCKET_NAME_PROD: 'bucket', R2_ACCESS_KEY_ID_PROD: 'dummy-access', R2_SECRET_ACCESS_KEY_PROD: 'dummy-secret', R2_REGION_PROD: 'auto' };
  const file = join(folder, 'manifest.json');
  const local = { path: 'cover.webp', size: bytes.length, sha256: sha(bytes), md5: md5(bytes), detected_extension: '.webp' };
  const manifest = { source: folder, snapshot_sha256: 'a'.repeat(64), r2_objects: [
    { source: 'missing.webp', target: 'fixed.webp', local, mime_type: 'image/webp' },
    { source: 'legacy.webp', target: 'one.webp', local: { path: 'unused.webp', size: legacy.length, sha256: sha(legacy), md5: md5(legacy) }, mime_type: 'image/webp' },
    { source: 'legacy.webp', target: 'two.webp', local: { path: 'unused.webp', size: legacy.length, sha256: sha(legacy), md5: md5(legacy) }, mime_type: 'image/webp' },
    { source: 'optional.mp4', target: 'optional-new.mp4', local: null, optional: true },
  ] };
  try {
    writeFileSync(file, JSON.stringify(manifest));const first = await run(file, env);assert.equal(first.code, 0, first.output);
    assert.deepEqual(objects.get('fixed.webp').bytes, bytes);assert.deepEqual(objects.get('one.webp').bytes, legacy);assert.deepEqual(objects.get('two.webp').bytes, legacy);assert.equal(objects.has('missing.webp'), false);assert.equal(uploadCount, 2);
    const oldWrites = writes;writeFileSync(file, JSON.stringify({ ...manifest, revision: 2 }));const second = await run(file, env);assert.equal(second.code, 0, second.output);assert.equal(writes, oldWrites);
    const ready = JSON.parse(readFileSync(join(folder, 'r2-ready.json')));assert.equal(ready.verified, 4);assert.deepEqual(ready.errors, []);
    writeFileSync(file, JSON.stringify({ ...manifest, r2_objects: [{ source: 'missing-without-evidence', target: 'blocked', local: null }] }));const blocked = await run(file, env);assert.equal(blocked.code, 1);assert.equal(objects.has('blocked'), false);
    // A real remote cover revision must win over the stale local cover. Its
    // associated original is independently proved, and originals never accept
    // an evidence override. Reuse the same-frozen-manifest origin success.
    const original = Buffer.from('original MP4 bytes remain unchanged');
    const improved = Buffer.concat([Buffer.from('RIFF'), Buffer.from([12, 0, 0, 0]), Buffer.from('WEBPVP8 ')]);
    const oldCover = Buffer.from('stale local cover');writeFileSync(join(folder, 'improved.webp'), improved);
    objects.set('orig.mp4', { bytes: original, mime: 'video/mp4' });objects.set('improved.webp', { bytes: improved, mime: 'image/webp' });
    const reconciliation = { source: folder, snapshot_sha256: 'b'.repeat(64), d1_changes: [{ table: 'w_wallpapers', before: { origin_key: 'orig.mp4' }, after: { compress_key: 'good.webp' } }], r2_objects: [
      { role: 'origin_key', source: 'orig.mp4', target: 'orig-new.mp4', local: { path: 'orig.mp4', size: original.length, sha256: sha(original), md5: md5(original) }, mime_type: 'video/mp4' },
      { role: 'compress_key', source: 'improved.webp', target: 'good.webp', local: { path: 'old.webp', size: oldCover.length, sha256: sha(oldCover), md5: md5(oldCover) }, mime_type: 'image/webp' },
    ] };
    writeFileSync(file, JSON.stringify(reconciliation));const failedCover = await run(file, env);assert.equal(failedCover.code, 1);
    const overlayPath = join(folder, 'overlay.json');const overlay = { manifest_sha256: sha(readFileSync(file)), errors: [], entries: [{
      role: 'compress_key', source: 'improved.webp', target: 'good.webp', local: { path: 'improved.webp', absolute_path: join(folder, 'improved.webp'), sha256: sha(improved), md5: md5(improved), size: improved.length },
      remote: { sha256: sha(improved), webpSignatureVerified: true }, originals: [{ source: 'orig.mp4', sha256: sha(original), etag: `"${md5(original)}"`, size: original.length }],
    }] };
    writeFileSync(overlayPath, JSON.stringify(overlay));const beforeOriginalHeads = headCounts.get('orig.mp4');
    const reconciled = await run(file, env, ['--evidence-overlay', overlayPath, '--overlay-sha256', sha(readFileSync(overlayPath)), '--retry-errors-only']);assert.equal(reconciled.code, 0, reconciled.output);
    assert.deepEqual(objects.get('good.webp').bytes, improved);assert.equal(headCounts.get('orig.mp4') - beforeOriginalHeads, 1);
    const reconciledReady = JSON.parse(readFileSync(join(folder, 'r2-ready.json')));assert.equal(reconciledReady.expected, 2);assert.equal(reconciledReady.verified, 2);assert.equal(reconciledReady.trustedSuccesses, 1);
    // Local authority keeps the selected frozen frame, while backing up the
    // independently measured remote version. These byte lengths differ.
    writeFileSync(join(folder, 'old.webp'), oldCover);objects.set('remote-stale.webp', { bytes: improved, mime: 'image/webp' });
    const localManifest = { ...reconciliation, d1_changes: [{ table: 'w_wallpapers', before: { origin_key: 'orig.mp4' }, after: { compress_key: 'local-good.webp' } }], r2_objects: [reconciliation.r2_objects[0], { ...reconciliation.r2_objects[1], source: 'remote-stale.webp', target: 'local-good.webp' }] };
    writeFileSync(file, JSON.stringify(localManifest));const localFirst = await run(file, env);assert.equal(localFirst.code, 1);
    const localOverlay = { manifest_sha256: sha(readFileSync(file)), errors: [], entries: [{ ...overlay.entries[0], source: 'remote-stale.webp', target: 'local-good.webp', authority: 'local', local: localManifest.r2_objects[1].local, remote_local: overlay.entries[0].local }] };
    writeFileSync(overlayPath, JSON.stringify(localOverlay));
    const localResult = await run(file, env, ['--evidence-overlay', overlayPath, '--overlay-sha256', sha(readFileSync(overlayPath)), '--cover-authority', 'local', '--retry-errors-only']);assert.equal(localResult.code, 0, localResult.output);
    assert.deepEqual(objects.get('local-good.webp').bytes, oldCover);assert.deepEqual(objects.get('remote-stale.webp').bytes, improved);
    const localJournal = readFileSync(join(folder, 'r2-journal.jsonl'), 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(row => row.source === 'remote-stale.webp' && !row.failed).at(-1);
    assert.equal(localJournal.cover_authority, 'local');assert.equal(localJournal.source_sha256, sha(improved));assert.equal(localJournal.backup_sha256, sha(improved));assert.equal(localJournal.target_sha256, sha(oldCover));assert.equal(localJournal.sha256, sha(oldCover));
    assert.equal(localJournal.sourceInfo.size, improved.length);assert.equal(localJournal.backupInfo.size, improved.length);assert.equal(localJournal.targetInfo.size, oldCover.length);assert.deepEqual(objects.get(localJournal.backup).bytes, improved);
    const localWrites = writes;const localRepeat = await run(file, env, ['--evidence-overlay', overlayPath, '--cover-authority', 'local', '--retry-errors-only']);assert.equal(localRepeat.code, 0, localRepeat.output);assert.equal(writes, localWrites);
    const occupied = Buffer.from('different occupied canonical object');objects.set('occupied.webp', { bytes: occupied, mime: 'image/webp' });
    const occupiedManifest = { ...localManifest, d1_changes: [{ table: 'w_wallpapers', before: { origin_key: 'orig.mp4' }, after: { compress_key: 'occupied.webp' } }], r2_objects: [localManifest.r2_objects[0], { ...localManifest.r2_objects[1], target: 'occupied.webp' }] };
    writeFileSync(file, JSON.stringify(occupiedManifest));const occupiedOverlay = { ...localOverlay, manifest_sha256: sha(readFileSync(file)), entries: [{ ...localOverlay.entries[0], target: 'occupied.webp' }] };writeFileSync(overlayPath, JSON.stringify(occupiedOverlay));
    const occupiedResult = await run(file, env, ['--evidence-overlay', overlayPath, '--cover-authority', 'local']);assert.equal(occupiedResult.code, 1);assert.deepEqual(objects.get('occupied.webp').bytes, occupied);
    // R2 multipart source ETags and single-part copied object ETags use
    // different formulas. A verified local multipart digest must prove source
    // bytes without redundant source/backup/target GETs.
    const partSize = 5 * 1024 * 1024, multipartBytes = Buffer.alloc(partSize + 17, 0x67);
    const multipartEtag = data => md5(Buffer.concat([createHash('md5').update(data.subarray(0, partSize)).digest(), createHash('md5').update(data.subarray(partSize)).digest()])) + '-2';
    writeFileSync(join(folder, 'multipart.mp4'), multipartBytes);
    const multiLocal = { path: 'multipart.mp4', size: multipartBytes.length, sha256: sha(multipartBytes), md5: md5(multipartBytes) };
    const multiManifest = { source: folder, snapshot_sha256: 'c'.repeat(64), r2_objects: [{ source: 'multipart.mp4', target: 'multipart-copy.mp4', role: 'origin_key', local: multiLocal, mime_type: 'video/mp4' }] };
    const multiBackup = '_catalog-backups/' + 'c'.repeat(16) + '/multipart.mp4';
    objects.set('multipart.mp4', { bytes: multipartBytes, mime: 'video/mp4', etag: multipartEtag(multipartBytes) });objects.set(multiBackup, { bytes: multipartBytes, mime: 'video/mp4' });objects.set('multipart-copy.mp4', { bytes: multipartBytes, mime: 'video/mp4' });
    writeFileSync(file, JSON.stringify(multiManifest));const multipartResult = await run(file, env);assert.equal(multipartResult.code, 0, multipartResult.output);
    assert.equal(getCounts.get('multipart.mp4') || 0, 0);assert.equal(getCounts.get(multiBackup) || 0, 0);assert.equal(getCounts.get('multipart-copy.mp4') || 0, 0);
    const multipartJournal = () => readFileSync(join(folder, 'r2-journal.jsonl'), 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line)).filter(row => row.source === 'multipart.mp4' && !row.failed).at(-1);
    assert.equal(multipartJournal().sourceVerification.kind, 'multipart-etag');assert.equal(multipartJournal().sourceVerification.partSize, partSize);
    objects.get('multipart.mp4').etag = multipartEtag(multipartBytes).replace('-2', '-3');
    const wrongCount = await run(file, env);assert.equal(wrongCount.code, 0, wrongCount.output);assert.equal(getCounts.get('multipart.mp4'), 1);assert.equal(multipartJournal().sourceVerification.kind, 'full-get-sha256');
    assert.equal(getCounts.get(multiBackup) || 0, 0);assert.equal(getCounts.get('multipart-copy.mp4') || 0, 0);
    const changedPart = Buffer.from(multipartBytes);changedPart[0] ^= 0xff;objects.set('multipart.mp4', { bytes: changedPart, mime: 'video/mp4', etag: multipartEtag(changedPart) });
    const changedPartManifest = { ...multiManifest, r2_objects: [{ ...multiManifest.r2_objects[0], target: 'multipart-changed-blocked.mp4' }] };writeFileSync(file, JSON.stringify(changedPartManifest));
    const changedPartResult = await run(file, env);assert.equal(changedPartResult.code, 1);assert.equal(objects.has('multipart-changed-blocked.mp4'), false);
    writeFileSync(file, JSON.stringify(occupiedManifest));
    const invalid = { ...occupiedOverlay, entries: [{ ...occupiedOverlay.entries[0], role: 'origin_key' }] };writeFileSync(overlayPath, JSON.stringify(invalid));
    const rejected = await run(file, env, ['--evidence-overlay', overlayPath, '--cover-authority', 'local']);assert.notEqual(rejected.code, 0);assert.match(rejected.output, /Overlay can only reconcile measured WebP covers/);
    objects.set('orig.mp4', { bytes: Buffer.from('changed original bytes'), mime: 'video/mp4' });
    const changedManifest = { ...localManifest, d1_changes: [{ table: 'w_wallpapers', before: { origin_key: 'orig.mp4' }, after: { compress_key: 'blocked-original.webp' } }], r2_objects: [localManifest.r2_objects[0], { ...localManifest.r2_objects[1], target: 'blocked-original.webp' }] };
    writeFileSync(file, JSON.stringify(changedManifest));const changedOverlay = { ...localOverlay, manifest_sha256: sha(readFileSync(file)), entries: [{ ...localOverlay.entries[0], target: 'blocked-original.webp' }] };writeFileSync(overlayPath, JSON.stringify(changedOverlay));
    const changedOriginal = await run(file, env, ['--evidence-overlay', overlayPath, '--cover-authority', 'local']);assert.equal(changedOriginal.code, 1);assert.equal(objects.has('blocked-original.webp'), false);
  } finally { await new Promise(resolve => server.close(resolve));rmSync(folder, { recursive: true, force: true }); }
});
