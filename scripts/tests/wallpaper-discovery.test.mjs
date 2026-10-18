import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTsLoader } from './load-ts.mjs';
import { sqliteD1 } from './sqlite-d1.mjs';

const load = createTsLoader();
const asset = (extra = {}) => ({ name: 'image', type: 'image/png', size: '2 MB',
  originPath: 'phone/origin/a.png', compressPath: 'phone/compress/a.webp', tag: '',
  tags: ['gradient', 'abstract'], width: 1080, height: 2340, category: 'phone', ...extra });

test('intro describes actual sizes without claiming unknown images share a resolution', () => {
  const { buildCollectionIntro } = load('src/lib/collection-intro.ts');
  const collection = { name: 'Galaxy A17', mediaType: 'static', item: [asset(), asset({ width: null })] };
  const copy = buildCollectionIntro('en', collection);
  assert.match(copy, /2/);
  assert.match(copy, /1080 × 2340/);
  assert.match(copy, /some|available|known/i);
  assert.doesNotMatch(copy, /4K|PC|Mac/);
  for (const lang of ['en', 'zh', 'ja', 'vi', 'zh-hant']) {
    assert.match(buildCollectionIntro(lang, { ...collection, description: 'Editorial detail.' }), /Editorial detail\./);
    assert.doesNotMatch(buildCollectionIntro(lang, { ...collection, item: [asset({ width: 0 })] }), /0 ×|undefined|null/);
  }
  assert.match(buildCollectionIntro('en', { ...collection, item: [asset({ category: 'desktop', width: 3840, height: 2160 })] }), /PC.*Mac/);
  const live = buildCollectionIntro('en', { ...collection, mediaType: 'dynamic', item: [asset({ type: 'video/mp4' })] });
  assert.match(live, /video/i);
  assert.doesNotMatch(live, /iPhone/);
});

test('recommendations prefer genuine series over matching resolution, exclude self, and stay stable', () => {
  const { rankRelatedCollections } = load('src/lib/wallpaper-discovery.ts');
  const current = { deviceId: 'a', deviceName: 'Samsung Galaxy A17', deviceCategory: 'phone', resolutions: ['1080x2340'] };
  const row = (id, name, sizes) => ({ deviceId: id, deviceName: name, name, slug: id,
    deviceCategory: 'phone', count: 2, resolutions: sizes, date: '2026/01/01' });
  const rows = [row('b', 'Samsung Galaxy S25', ['1080x2340']), row('a', 'Samsung Galaxy A17', []),
    row('c', 'Samsung Galaxy A16', ['1440x3200']), { ...row('tablet', 'Galaxy Tab A9', []), deviceCategory: 'pad' }];
  assert.deepEqual(rankRelatedCollections(current, rows).map(r => r.deviceId), ['c', 'b']);
  assert.deepEqual(rankRelatedCollections(current, rows.slice().reverse()), rankRelatedCollections(current, rows));
  assert.ok(rankRelatedCollections(current, Array.from({ length: 20 }, (_, i) => row(String(i), `Galaxy A${i}`, []))).length <= 8);
  assert.deepEqual(rankRelatedCollections(current, [{ ...row('sept', 'Galaxy A18', []), date: '2026/9' },
    { ...row('oct', 'Galaxy A19', []), date: '2026/10' }]).map(r => r.slug), ['oct', 'sept']);
});

test('fresh intro removes repeated legacy counts but retains model-specific editorial details', () => {
  const { buildCollectionIntro } = load('src/lib/collection-intro.ts');
  const copy = buildCollectionIntro('en', { name: 'Galaxy A17', item: [asset()],
    description: 'Download 2 Galaxy A17 wallpapers as original PNG files at 2340×2340 pixels. Compare the blue-cyan and blue-mint gradients. Preview each image before downloading for free.' });
  assert.match(copy, /Download 1 Galaxy A17/);
  assert.doesNotMatch(copy, /Download 2|Preview each image/);
  assert.match(copy, /blue-cyan and blue-mint/);
});

test('ten themes have unique slugs; only reviewed static IDs and real tag matches become links', () => {
  const { WALLPAPER_THEMES, getWallpaperTheme, themePathForTag, matchesTheme } = load('src/lib/wallpaper-themes.ts');
  assert.equal(WALLPAPER_THEMES.length, 10);
  assert.equal(new Set(WALLPAPER_THEMES.map(t => t.slug)).size, 10);
  assert.equal(getWallpaperTheme('unknown'), null);
  assert.equal(themePathForTag('gradient'), '/en/themes/gradient');
  assert.equal(themePathForTag('gradient', 'zh'), '/zh/themes/gradient');
  assert.equal(themePathForTag('coffee'), null);
  assert.equal(matchesTheme(getWallpaperTheme('minimal-geometric'), asset({ tags: ['minimalist'] })), false);
  assert.equal(matchesTheme(getWallpaperTheme('minimal-geometric'), asset({ tags: ['minimalist', 'geometric'] })), true);
  assert.equal(matchesTheme(getWallpaperTheme('gradient'), asset({ type: 'video/mp4' })), false);
});

test('D1 recommendations count only the same visible media and omit deleting collections', async t => {
  const db = sqliteD1(t);
  const local = createTsLoader({ '@/lib/wallpaper-db': { getWallpaperDb: () => db },
    '@/lib/wallpaper-query-cache': { withWallpaperQueryCache: (_key, fn) => fn() } });
  const { loadRelatedCollections } = local('src/lib/wallpaper-discovery-db.ts');
  db.seed([{ sql: "UPDATE w_wallpapers SET width=1080,height=2340 WHERE media_type='static'" }]);
  const rows = await loadRelatedCollections('samsung', { deviceId: 'device-new', deviceName: 'Galaxy S27',
    deviceCategory: 'phone', mediaType: 'static', item: [asset()] }, 'zh');
  const old = rows.find(r => r.deviceId === 'device-old');
  assert.equal(old.count, 2);
  assert.equal(old.name, '三星 Galaxy S25');
  assert.ok(!rows.some(r => r.deviceId === 'device-draft' || r.deviceId === 'device-new'));
  db.seed([{ sql: "INSERT INTO w_collection_deletions(device_id,media_type,deletion_state,updated_date,lease_token) VALUES('device-old','static','processing',1,'test')" }]);
  assert.ok(!(await loadRelatedCollections('samsung', { deviceId: 'device-new', deviceName: 'Galaxy S27',
    deviceCategory: 'phone', mediaType: 'static', item: [asset()] }, 'en')).some(r => r.deviceId === 'device-old'));
});

test('theme pages preserve the requested language and the current theme on language switching', async () => {
  const { NextRequest } = await import('next/server.js');
  const { middleware } = load('src/middleware.ts');
  const request = path => new NextRequest(`https://phwalls.com${path}`, {
    headers: { cookie: 'phwalls-lang=zh; phwalls-lang-selected=1' },
  });
  assert.equal(middleware(request('/en/themes/gradient')).headers.get('location'), 'https://phwalls.com/zh/themes/gradient');
  assert.equal(middleware(request('/zh/themes/gradient')).headers.get('x-middleware-rewrite'), 'https://phwalls.com/themes/gradient');
  assert.equal(middleware(request('/themes/gradient')).headers.get('location'), 'https://phwalls.com/zh/themes/gradient');
  const { withLanguagePath } = load('src/lib/language.ts');
  for (const language of ['en', 'zh', 'ja', 'vi', 'zh-hant']) {
    assert.equal(withLanguagePath('/en/themes/dark', language), `/${language}/themes/dark`);
  }
  assert.equal(middleware(request('/en/wallpapers/samsung/galaxy-a17')).headers.get('location'), 'https://phwalls.com/zh/wallpapers/samsung/galaxy-a17');
});

test('all ten themes have complete localized titles and descriptions without falling back to English', () => {
  const { WALLPAPER_THEMES, getWallpaperThemeCopy, themePath } = load('src/lib/wallpaper-themes.ts');
  for (const theme of WALLPAPER_THEMES) {
    const english = getWallpaperThemeCopy(theme, 'en');
    for (const language of ['zh', 'ja', 'vi', 'zh-hant']) {
      const copy = getWallpaperThemeCopy(theme, language);
      assert.ok(copy.title && copy.description);
      assert.notEqual(copy.title, english.title);
      assert.notEqual(copy.description, english.description);
      assert.equal(themePath(theme, language), `/${language}/themes/${theme.slug}`);
    }
  }
});

test('curated theme queries retain editorial order and omit retagged, unpublished and deleting media', async t => {
  const db = sqliteD1(t);
  db.seed([{ sql: `UPDATE w_wallpapers SET width=1080,height=2340,tags='["gradient"]'` }]);
  const local = createTsLoader({ '@/lib/wallpaper-db': {
    getWallpaperDb: () => db,
    toWallpaperAsset: row => asset({ id: row.id, type: row.mime_type, originPath: row.origin_key,
      compressPath: row.compress_key, tags: JSON.parse(row.tags) }),
  }, '@/lib/theme-selections': { THEME_SELECTIONS: { gradient: ['asset-new', 'asset-draft', 'asset-other', 'asset-deleted', 'asset-live'] } },
    '@/lib/wallpaper-query-cache': { withWallpaperQueryCache: (_key, fn) => fn() } });
  const { loadThemeWallpapers, loadThemeCards } = local('src/lib/wallpaper-theme-db.ts');
  const theme = load('src/lib/wallpaper-themes.ts').getWallpaperTheme('gradient');
  assert.deepEqual((await loadThemeWallpapers(theme)).map(row => row.id), ['asset-new', 'asset-other']);
  assert.equal((await loadThemeWallpapers(theme, 'zh')).find(row => row.id === 'asset-other').sourceName, '三星 Galaxy S25');
  const cards = await loadThemeCards('zh');
  assert.equal(cards.length, 1);
  assert.equal(cards[0].slug, 'gradient');
  assert.equal(cards[0].count, 2);
  assert.match(cards[0].coverUrl, /asset-new\.webp$/);
  assert.deepEqual(await loadThemeCards('zh', [load('src/lib/wallpaper-themes.ts').getWallpaperTheme('dark')]), []);
  db.seed([{ sql: `UPDATE w_wallpapers SET tags='["photography"]' WHERE id='asset-new'` }]);
  assert.deepEqual((await loadThemeWallpapers(theme)).map(row => row.id), ['asset-other']);
});
