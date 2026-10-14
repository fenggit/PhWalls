import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const collection = {
  name: 'Infinix Note 60 Pro', slug: 'infinix-note-60', date: '2026/02/18',
  item: [{ name: 'infinix-note-60-pro-1', type: 'image/png', size: '1 MB',
    originPath: 'transsion infinix/Infinix Note 60 Pro/origin/infinix-note-60-pro-1.png',
    compressPath: 'transsion infinix/Infinix Note 60 Pro/compress/infinix-note-60-pro-1.webp' }],
};

test('search renders a renamed model using its stable slug instead of a new model-name URL', () => {
  const require = createRequire(import.meta.url);
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const ts = require('typescript');
  const entries = [{ category: 'transsion-infinix', name: collection.name, slug: collection.slug,
    date: collection.date, count: 19, desktop: false, keywords: 'infinix-note-60-pro-1' }];
  let state = 0;
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL('../src/components/SearchDialog.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  runInNewContext(source, { module, exports: module.exports, require(specifier) {
    if (specifier === 'react') return { ...React, useState: () => [['Note 60 Pro', entries, 'ready'][state++], () => {}],
      useEffect() {}, useMemo: (fn) => fn(), useRef: () => ({ current: null }) };
    if (specifier === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (specifier === '@/lib/data') return { getTabData: () => [], localizeWallpaperCollectionName: (_, name) => name };
    if (specifier === '@/lib/desktop-data') return { getDesktopTabData: () => [] };
    if (specifier === '@/lib/live-data') return { getLiveTabData: () => [] };
    if (specifier === '@/lib/live-paths') return {};
    if (specifier === '@/lib/device-brand-label') return {};
    if (specifier === '@/lib/wallpaper-data') return { buildWallpaperDetailPath: (category, name) => `/wallpapers/${category}/${name.toLowerCase().replace(/\s+/g, '-')}` };
    if (specifier === '@/lib/brands') return { buildBrandPath: (type) => `/${type}`, normalizeCategoryType: (type) => type };
    if (specifier === '@/lib/language') return { withLanguagePath: (path) => `/en${path}` };
    if (specifier === '@/lib/i18n') return { getI18nTexts: () => ({ search: 'Search' }) };
    return require(specifier);
  } });
  const html = renderToStaticMarkup(React.createElement(module.exports.default, { language: 'en', onClose() {} }));
  assert.match(html, /href="\/en\/wallpapers\/transsion-infinix\/infinix-note-60"/);
  assert.match(html, /Infinix Note 60 Pro/);
  assert.doesNotMatch(html, /href="[^\"]*\/infinix-note-60-pro"/);
});

test('a future D1 import keeps the original device identity after its display name is corrected', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'phwalls-stable-import-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'src/data/desktopwalls'), { recursive: true });
  cpSync(new URL('../scripts/import-wallpapers-d1.mjs', import.meta.url), join(root, 'scripts/import-wallpapers-d1.mjs'));
  writeFileSync(join(root, 'src/data/transsion infinix.json'), JSON.stringify([collection]));
  const sqlPath = join(root, 'import.sql');
  const result = spawnSync(process.execPath, [join(root, 'scripts/import-wallpapers-d1.mjs'), '--data-dir', join(root, 'src/data'), '--out', sqlPath], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  for (const migration of readdirSync(new URL('../migrations/', import.meta.url)).filter((file) => file.endsWith('.sql')).sort()) {
    db.exec(readFileSync(new URL(`../migrations/${migration}`, import.meta.url), 'utf8'));
  }
  db.exec(readFileSync(sqlPath, 'utf8'));
  const row = db.prepare("SELECT id, device_name, device_slug FROM w_devices WHERE brand_name='transsion-infinix'").get();
  assert.equal(row.device_name, collection.name);
  assert.equal(row.device_slug, collection.slug);
  assert.equal(row.id, 'd3372c45f1569eae005f6431b0ded68c');
});
