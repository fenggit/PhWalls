import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
const ts = createRequire(import.meta.url)('typescript');
const source = new URL('../src/lib/admin-mixed-upload.ts', import.meta.url);
const mod = { exports: {} };
if (existsSync(source)) runInNewContext(ts.transpileModule(readFileSync(source, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: mod, exports: mod.exports });
const file = (name, type, role) => ({ file: { name, type, size: 100 }, role });
test('mixed originals own their covers and optional MP4 preview', () => {
  assert.equal(typeof mod.exports.pairAdminUploadFiles, 'function');
  const result = mod.exports.pairAdminUploadFiles([file('still.jpg','image/jpeg','origin'), file('live.mp4','video/mp4','origin'), file('still.webp','image/webp','compress'), file('live.webp','image/webp','compress'), file('live.mp4','video/mp4','preview')]);
  assert.equal(result.items.length, 2); assert.equal(result.issues.length, 0);
  assert.equal(result.items[1].mediaType, 'dynamic'); assert.equal(result.items[1].preview.name, 'live.webp');
});
test('duplicate original or cover stems block pairing without overwriting', () => {
  assert.equal(typeof mod.exports.pairAdminUploadFiles, 'function');
  const result = mod.exports.pairAdminUploadFiles([file('01.jpg','image/jpeg','origin'),file('01.mp4','video/mp4','origin'),file('01.webp','image/webp','compress')]);
  assert.equal(result.items.length, 0); assert.equal(result.issues[0].code, 'duplicate-origin');
  const covers = mod.exports.pairAdminUploadFiles([file('02.jpg','image/jpeg','origin'),file('02.webp','image/webp','compress'),file('02.png','image/png','compress')]);
  assert.equal(covers.items.length, 0); assert.equal(covers.issues[0].code, 'duplicate-cover');
});
test('orphans, case differences and unsupported videos are explicit issues', () => {
  assert.equal(typeof mod.exports.pairAdminUploadFiles, 'function');
  const result = mod.exports.pairAdminUploadFiles([file('A.jpg','image/jpeg','origin'),file('a.webp','image/webp','compress'),file('movie.webm','video/webm','origin'),file('lonely.mp4','video/mp4','preview')]);
  assert.ok(result.issues.some(x=>x.code==='orphan')); assert.ok(result.issues.some(x=>x.code==='unsupported'));
  assert.ok(result.items[0].issues.includes('missing-cover'));
});
test('publication only includes selected successful IDs from the current queue', () => {
  assert.equal(typeof mod.exports.successfulAdminUploadIds, 'function');
  const ids = mod.exports.successfulAdminUploadIds([{state:'done',wallpaperId:'new-static'}, {state:'failed',wallpaperId:'old-id'}, {state:'done',wallpaperId:'new-live',selected:false}, {state:'done'}]);
  assert.equal(JSON.stringify(ids), JSON.stringify(['new-static']));
});
test('expired untouched grants can renew but expired uploaded groups require reconciliation', () => {
  assert.equal(typeof mod.exports.adminUploadRetryPolicy, 'function');
  assert.equal(mod.exports.adminUploadRetryPolicy([{expiresAt:900}], false, 1000), 'renew');
  assert.equal(mod.exports.adminUploadRetryPolicy([{expiresAt:900},{expiresAt:1200}], true, 1000), 'reconcile');
  assert.equal(mod.exports.adminUploadRetryPolicy([{expiresAt:1200}], true, 1000), 'reuse');
});
