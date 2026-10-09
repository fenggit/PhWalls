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
