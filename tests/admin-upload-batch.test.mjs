import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const module = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/admin-upload-batch.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports });
const { uploadAdminBatch } = module.exports;
const pathModule = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/admin-upload-path.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: pathModule, exports: pathModule.exports });

test('upload directories reuse historical paths separately for each media type', () => {
  const device = { device_category: 'phone_fold', brand_name: 'huawei', device_slug: 'huawei-mate-xt-2' };
  const files = [
    { media_type: 'static', origin_key: 'huawei/Huawei Mate XT 2/origin/still.png' },
    { media_type: 'dynamic', origin_key: 'live/Huawei/Huawei Mate XT 2/origin/live.mp4' },
    { media_type: 'dynamic', origin_key: 'live/Huawei/Huawei Mate XT 2/origin/second.mp4' },
  ];
  assert.equal(pathModule.exports.getAdminUploadDirectories(device, 'static', files).prefix, 'huawei/Huawei Mate XT 2');
  const live = pathModule.exports.getAdminUploadDirectories(device, 'dynamic', files);
  assert.equal(live.prefix, 'live/Huawei/Huawei Mate XT 2');
  assert.equal(live.directories.length, 1);
  assert.equal(live.source, 'existing');
});

test('multiple historical directories require an explicit choice and new media uses a default', () => {
  const device = { device_category: 'desktop', brand_name: 'windows', device_slug: 'windows-11' };
  const files = [
    { media_type: 'static', origin_key: 'desktopwalls/Windows/Windows 11/origin/a.png' },
    { media_type: 'static', origin_key: 'desktopwalls/windows/windows-11/origin/b.png' },
  ];
  const still = pathModule.exports.getAdminUploadDirectories(device, 'static', files);
  assert.equal(still.prefix, '');
  assert.equal(still.directories.length, 2);
  assert.equal(still.source, 'multiple');
  assert.equal(pathModule.exports.getAdminUploadDirectories(device, 'dynamic', files).prefix, 'live/windows/windows-11');
});

test('malformed historical paths cannot become upload targets', () => {
  const device = { device_category: 'phone', brand_name: 'huawei', device_slug: 'mate' };
  const files = [{ media_type: 'dynamic', origin_key: 'live/../mate/origin/a.mp4' }];
  assert.equal(pathModule.exports.getAdminUploadDirectories(device, 'dynamic', files).prefix, 'live/huawei/mate');
});

test('selected upload media validates the original and always requires an image cover', () => {
  assert.doesNotThrow(() => pathModule.exports.assertAdminUploadMime('video/mp4', 'origin', 'dynamic'));
  assert.doesNotThrow(() => pathModule.exports.assertAdminUploadMime('image/webp', 'compress', 'dynamic'));
  assert.throws(() => pathModule.exports.assertAdminUploadMime('image/png', 'origin', 'dynamic'));
  assert.throws(() => pathModule.exports.assertAdminUploadMime('video/mp4', 'origin', 'static'));
  assert.throws(() => pathModule.exports.assertAdminUploadMime('video/mp4', 'compress', 'dynamic'));
  assert.throws(() => pathModule.exports.assertAdminUploadMime('text/plain', 'origin', 'static'));
});

test('default upload directories separate static and Live files for the same device or system', () => {
  const pathModule = { exports: {} };
  runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/admin-upload-path.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module: pathModule, exports: pathModule.exports });
  const device = { device_category: 'os', brand_name: 'xiaomi', device_slug: 'miui-13' };
  assert.equal(pathModule.exports.deviceR2Prefix(device, 'static'), 'xiaomi/miui-13');
  assert.equal(pathModule.exports.deviceR2Prefix(device, 'dynamic'), 'live/xiaomi/miui-13');
});

test('publication offer waits until every queued upload succeeds', async () => {
  const events = [];
  await uploadAdminBatch(['first', 'second'], async (row) => {
    events.push(`upload:${row}`);
    assert.ok(!events.some((event) => event.startsWith('offer:')));
    return true;
  }, (count) => events.push(`offer:${count}`));
  assert.deepEqual(events, ['upload:first', 'upload:second', 'offer:2']);
});

test('partially failed uploads finish processing without offering publication', async () => {
  const events = [];
  await uploadAdminBatch(['first', 'failed', 'last'], async (row) => {
    events.push(row);
    return row !== 'failed';
  }, () => assert.fail('A partial upload must not offer publication'));
  assert.deepEqual(events, ['first', 'failed', 'last']);
});

test('a successful retry offers publication and an empty queue does not', async () => {
  let offered = 0;
  await uploadAdminBatch([], async () => assert.fail('Empty queue'), () => assert.fail('Empty queue'));
  await uploadAdminBatch(['retry'], async () => true, (count) => { offered += count; });
  assert.equal(offered, 1);
});
