import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const module = { exports: {} };
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/admin-release-date.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports });
const { normalizeAdminReleaseDate } = module.exports;

test('Chinese and numeric release dates normalize to sortable slash dates', () => {
  for (const [input, expected] of [
    ['2021年9月22日', '2021/09/22'], [' 2021 年 9 月 2 日 ', '2021/09/02'],
    ['２０２１年９月２２日', '2021/09/22'], ['2021/9/22', '2021/09/22'],
    ['2021-09-22', '2021/09/22'], ['2024年2月29日', '2024/02/29'],
    ['2021', '2021'], ['2021/9', '2021/09'], ['2021年9月', '2021/09'],
  ]) assert.equal(normalizeAdminReleaseDate(input), expected);
});

test('invalid dates and blank required dates are rejected', () => {
  for (const input of ['', '   ', null, 2021, '2021年2月29日', '2021/13/01', '2021/9/31', '2021/09/00', 'unknown']) {
    assert.throws(() => normalizeAdminReleaseDate(input));
  }
  assert.equal(normalizeAdminReleaseDate('', true), '');
});
