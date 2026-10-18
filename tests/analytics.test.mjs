import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function setup({ pathname = '/zh/wallpapers/samsung/galaxy-s25', hostname = 'phwalls.com', gtag } = {}) {
  const module = { exports: {} };
  const window = { location: { pathname, hostname, origin: `https://${hostname}` },
    sessionStorage: { getItem: () => null }, gtag };
  runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { module, exports: module.exports, window, document: { documentElement: { lang: 'zh' } }, URL });
  return { api: module.exports, window };
}

test('search analytics normalize useful model queries and suppress personal/contact input', () => {
  const { api } = setup();
  assert.equal(api.normalizeAnalyticsSearch('  Galaxy   S25 Ultra  '), 'galaxy s25 ultra');
  assert.equal(api.normalizeAnalyticsSearch('华为 Mate 80'), '华为 mate 80');
  for (const query of ['a@example.com', '13812345678', '+1 (415) 555-0199', 'https://example.com/?token=secret', '1234567890123456']) {
    assert.equal(api.normalizeAnalyticsSearch(query), undefined, query);
  }
});

test('events carry language and page context without query strings and analytics cannot break actions', () => {
  const calls = [];
  const { api } = setup({ gtag: (...args) => calls.push(args) });
  api.trackAnalyticsEvent('w_wallpaper_download_started', { wallpaper_id: 'wall-1', file_size: '3 MB' });
  assert.equal(calls[0][2].site_language, 'zh');
  assert.equal(calls[0][2].page_type, 'collection');
  assert.equal(calls[0][2].page_path, '/zh/wallpapers/samsung/galaxy-s25');
  assert.equal(calls[0][2].wallpaper_id, 'wall-1');
  assert.doesNotThrow(() => setup({ gtag: () => { throw Error('analytics unavailable'); } }).api.trackAnalyticsEvent('w_share_click'));
});

test('events before Google initialization are queued, while admin and local traffic are excluded', () => {
  const { api, window } = setup();
  api.trackAnalyticsEvent('w_search_open');
  assert.equal(window.dataLayer.length, 1);
  assert.equal(window.dataLayer[0][0], 'event');
  assert.equal(window.dataLayer[0][1], 'w_search_open');
  for (const options of [{ pathname: '/manager' }, { pathname: '/zh/manager/devices' }, { hostname: 'localhost' }]) {
    const calls = [];
    setup({ ...options, gtag: (...args) => calls.push(args) }).api.trackAnalyticsEvent('w_search_open');
    assert.equal(calls.length, 0);
  }
});

test('content context preserves source IDs for downloads from a mixed theme gallery', () => {
  const { api } = setup();
  const params = api.getWallpaperAnalyticsParams({ id: 'w1', name: 'Blue', type: 'image/webp',
    originPath: 'private/path.webp', brand: 'samsung', sourcePath: '/wallpapers/samsung/s25', collectionId: 'd1' },
  { theme_slug: 'blue', entry_point: 'theme_gallery', collection_id: 'wrong', brand_slug: 'wrong' });
  assert.equal(params.wallpaper_id, 'w1');
  assert.equal(params.collection_id, 'd1');
  assert.equal(params.brand_slug, 'samsung');
  assert.equal(params.media_type, 'static');
  assert.equal(params.theme_slug, 'blue');
  assert.ok(!Object.values(params).includes('private/path.webp'));
});

test('share URLs retain wallpaper deep links and distinguish incoming shares without internal UTM tags', () => {
  const { api } = setup();
  const url = new URL(api.buildAnalyticsShareUrl('https://phwalls.com/en/themes/blue?wallpaper=Blue#preview', 'wallpaper'));
  assert.equal(url.searchParams.get('wallpaper'), 'Blue');
  assert.equal(url.searchParams.get('share_source'), 'wallpaper');
  assert.equal(url.hash, '');
  assert.equal(url.searchParams.has('utm_source'), false);
});

test('blocked session storage still allows production analytics and content categories never replace brand slugs', () => {
  const calls = [];
  const { api, window } = setup({ gtag: (...args) => calls.push(args) });
  window.sessionStorage.getItem = () => { throw Error('storage blocked'); };
  api.trackAnalyticsEvent('w_search_open');
  assert.equal(calls.length, 1);
  const item = { id: 'w1', name: 'Blue', type: 'image/webp', originPath: 'original.webp', category: 'phone_fold' };
  const params = api.getWallpaperAnalyticsParams(item, { brand_slug: 'samsung' });
  assert.equal(params.brand_slug, 'samsung');
  assert.equal(params.device_type, 'phone_fold');
  assert.equal(api.getAnalyticsPageContext('/ja/desktop/live-wallpapers/samsung/monitor').page_type, 'collection');
});
