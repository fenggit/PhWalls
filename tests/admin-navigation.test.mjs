import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const module = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/admin-navigation.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports, URL });
const { adminTabHref, resolveAdminTab } = module.exports;

test('sidebar links restore the selected view after reload and preserve other URL state', () => {
  const current = new URL('https://a.phwalls.com/manager?context=brand&tab=devices#queue');
  for (const tab of ['brands', 'devices', 'i18n', 'wallpapers', 'upload']) {
    const next = new URL(adminTabHref(current, tab), current);
    assert.equal(next.pathname, '/manager');
    assert.equal(next.searchParams.get('context'), 'brand');
    assert.equal(next.hash, '#queue');
    assert.equal(resolveAdminTab(next.searchParams.get('tab')), tab);
  }
});

test('absent or invalid sidebar views fall back to devices', () => {
  for (const value of [null, undefined, '', 'unknown', 'UPLOAD', ['upload']]) {
    assert.equal(resolveAdminTab(value), 'devices');
  }
});
