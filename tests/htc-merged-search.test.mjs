import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ts = require('typescript');
const index = JSON.parse(readFileSync(new URL('../public/search-index.json', import.meta.url), 'utf8'));

test('searching HTC U11+ opens the merged 42-wallpaper HTC U11 collection', () => {
  const entries = index.filter((entry) => entry.category === 'htc' && /^HTC U11\+?$/.test(entry.name));
  assert.equal(entries.length, 1);
  assert.equal(entries[0].name, 'HTC U11');
  assert.equal(entries[0].count, 42);
  let state = 0;
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL('../src/components/SearchDialog.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  runInNewContext(source, { module, exports: module.exports, require(specifier) {
    if (specifier === 'react') return { ...React, useState: () => [['HTC U11+', entries, 'ready'][state++], () => {}],
      useEffect() {}, useMemo: (fn) => fn(), useRef: () => ({ current: null }) };
    if (specifier === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (specifier === '@/lib/data') return { getTabData: () => [], localizeWallpaperCollectionName: (_, name) => name };
    if (specifier === '@/lib/desktop-data') return { getDesktopTabData: () => [] };
    if (specifier === '@/lib/wallpaper-data') return { buildWallpaperDetailPath: (category, name) => `/wallpapers/${category}/${name.toLowerCase().replace(/\s+/g, '-')}` };
    if (specifier === '@/lib/brands') return { buildBrandPath: (type) => `/${type}`, normalizeCategoryType: (type) => type };
    if (specifier === '@/lib/language') return { withLanguagePath: (path) => `/en${path}` };
    if (specifier === '@/lib/i18n') return { getI18nTexts: () => ({ search: 'Search' }) };
    return require(specifier);
  } });
  const html = renderToStaticMarkup(React.createElement(module.exports.default, { language: 'en', onClose() {} }));
  assert.match(html, /href="\/en\/wallpapers\/htc\/htc-u11"/);
});
