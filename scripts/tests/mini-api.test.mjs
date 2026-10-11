import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTsLoader } from './load-ts.mjs';
const load = createTsLoader({
  '@/lib/wallpaper-db': {
    getWallpaperDb() {
      throw new Error('D1 binding DB is unavailable');
    },
  },
});
const api = load('src/lib/mini-api.ts');
test('filters normalize brand slugs and retain explicit pagination/language', () => {
  const options = api.parseMiniOptions(
    new URLSearchParams(
      'kind=live&brand=Google%20Pixel&q=三星%20Galaxy&page=2&pageSize=12&lang=zh-hant',
    ),
  );
  assert.deepEqual(options, {
    kind: 'live',
    brand: 'google-pixel',
    query: '三星 Galaxy',
    page: 2,
    pageSize: 12,
    language: 'zh-hant',
  });
});
test('invalid or excessive query parameters fail before any database access', () => {
  for (const query of [
    'kind=video',
    'page=0',
    'page=1.5',
    'pageSize=61',
    'page=-2',
    'lang=de',
    'brand=../private',
    'q=' + 'a'.repeat(101),
    'page=1&page=2',
  ])
    assert.throws(
      () => api.parseMiniOptions(new URLSearchParams(query)),
      api.MiniApiError,
    );
});
test('asset IDs cannot select a different collection or accept arbitrary paths', () => {
  assert.deepEqual(api.parseMiniId('device-1:dynamic:asset-1', true), {
    deviceId: 'device-1',
    mediaType: 'dynamic',
    wallpaperId: 'asset-1',
  });
  for (const id of [
    '../private',
    'device-1:static:asset:extra',
    'device-1:static',
    'device-1:video:asset',
  ])
    assert.throws(() => api.parseMiniId(id, true), api.MiniApiError);
});
test('published media URLs stay on the proxy and encode paths correctly', () => {
  const row = {
    id: 'asset-1',
    device_id: 'device-1',
    media_type: 'dynamic',
    origin_key: 'live/Samsung/Galaxy S25/origin/a.mp4',
    compress_key: 'live/Samsung/Galaxy S25/compress/a.webp',
  };
  const links = api.miniMediaLinks(row, 'https://phwalls.com');
  assert.equal(
    links.downloadUrl,
    'https://phwalls.com/api/files/download?key=live%2FSamsung%2FGalaxy%20S25%2Forigin%2Fa.mp4',
  );
  assert.equal(
    links.videoUrl,
    'https://phwalls.com/api/files/preview?key=live%2FSamsung%2FGalaxy%20S25%2Forigin%2Fa.mp4',
  );
  assert.ok(
    links.previewUrl.startsWith(
      'https://phwalls.com/api/public/wallpaper-image?key=',
    ),
  );
  assert.throws(() =>
    api.miniMediaLinks(
      { ...row, origin_key: 'https://private.r2.test/a.mp4' },
      'https://phwalls.com',
    ),
  );
});
import { sqliteD1 } from './sqlite-d1.mjs';
const data = load('src/lib/mini-api-data.ts');
const options = (query) => api.parseMiniOptions(new URLSearchParams(query));
test('builtin desktop brands do not need a custom w_brands row', async (t) => {
  const db = sqliteD1(t);
  db.seed([{ sql: "UPDATE w_devices SET brand_name = 'microsoft-windows' WHERE id = 'device-desktop'" }]);
  const brands = await data.listMiniBrands(options('kind=desktop'), db);
  assert.deepEqual(brands.data.map((b) => [b.slug, b.title, b.kind, b.wallpaperCount]),
    [['microsoft-windows', '微软 Windows', 'desktop', 1]]);
  const result = await data.listMiniCollections(options('kind=desktop&q=微软'), 'https://phwalls.com', db);
  assert.equal(result.pagination.total, 1);
  assert.equal(result.data[0].kind, 'desktop');
  assert.equal(result.data[0].brandTitle, '微软 Windows');
  const detail = await data.getMiniCollection('device-desktop:static', options(''), 'https://phwalls.com', db);
  assert.equal(detail.data.wallpapers.length, 1);
  assert.equal(detail.data.wallpapers[0].kind, 'desktop');
  const phone = await data.listMiniCollections(options('kind=phone'), 'https://phwalls.com', db);
  assert.equal(phone.pagination.total, 3);
});
test('builtin mobile brands remain visible without a custom w_brands row', async (t) => {
  const db = sqliteD1(t);
  db.seed([{ sql: "DELETE FROM w_brands WHERE slug = 'samsung'" }]);
  const result = await data.listMiniCollections(options('kind=phone&q=三星'), 'https://phwalls.com', db);
  assert.equal(result.pagination.total, 3);
  assert.equal(result.data[0].kind, 'phone');
  assert.equal(result.data[0].brandTitle, '三星');
  const live = await data.listMiniBrands(options('kind=live'), db);
  assert.deepEqual(live.data.map((b) => [b.slug, b.wallpaperCount]), [['samsung', 1]]);
  const row = await data.getMiniWallpaper('device-old:dynamic:asset-live', options(''), 'https://phwalls.com', db);
  assert.equal(row.data.kind, 'live');
  await assert.rejects(data.getMiniWallpaper('device-draft:static:asset-private', options(''), 'https://phwalls.com', db), (e) => e.status === 404);
});
test('real SQLite filters private/deleting assets and reports paged collection totals', async (t) => {
  const db = sqliteD1(t);
  const result = await data.listMiniCollections(
    options('kind=phone&pageSize=1'),
    'https://phwalls.com',
    db,
  );
  assert.equal(result.pagination.total, 3);
  assert.equal(result.pagination.hasMore, true);
  assert.equal(result.data[0].id, 'device-new:static');
  const second = await data.listMiniCollections(
    options('kind=phone&pageSize=1&page=2'),
    'https://phwalls.com',
    db,
  );
  assert.equal(second.data[0].id, 'device-sept:static');
  const empty = await data.listMiniCollections(
    options('kind=phone&page=100'),
    'https://phwalls.com',
    db,
  );
  assert.equal(empty.pagination.total, 3);
  assert.deepEqual(empty.data, []);
});
test('brands count only published visible media of the requested type', async (t) => {
  const db = sqliteD1(t);
  const live = await data.listMiniBrands(options('kind=live'), db);
  assert.deepEqual(
    live.data.map((b) => [b.slug, b.wallpaperCount, b.collectionCount]),
    [['samsung', 1, 1]],
  );
  const desktop = await data.listMiniBrands(options('kind=desktop'), db);
  assert.deepEqual(
    desktop.data.map((b) => b.slug),
    ['windows'],
  );
});
test('combined Chinese brand/model search and literal wildcard searches work', async (t) => {
  const db = sqliteD1(t);
  const result = await data.listMiniCollections(
    options('q=三星%20Galaxy&kind=live'),
    'https://phwalls.com',
    db,
  );
  assert.deepEqual(
    result.data.map((c) => c.id),
    ['device-old:dynamic'],
  );
  const literal = await data.listMiniCollections(
    options('q=%25'),
    'https://phwalls.com',
    db,
  );
  assert.deepEqual(
    literal.data.map((c) => c.id),
    ['device-desktop:static'],
  );
});
test('collection pages keep static/live translations and primary-first order separate', async (t) => {
  const db = sqliteD1(t);
  const result = await data.getMiniCollection(
    'device-old:static',
    options('pageSize=1'),
    'https://phwalls.com',
    db,
  );
  assert.equal(result.data.collection.name, '三星 Galaxy S25');
  assert.equal(result.pagination.total, 2);
  assert.equal(result.data.wallpapers[0].name, 'z-primary');
  const live = await data.getMiniCollection(
    'device-old:dynamic',
    options('lang=vi'),
    'https://phwalls.com',
    db,
  );
  assert.equal(live.data.collection.name, 'Galaxy S25 Live');
  assert.equal(live.data.collection.description, 'English live description');
});
test('wallpaper details reject unpublished/deleting/mismatched identities', async (t) => {
  const db = sqliteD1(t);
  for (const id of [
    'device-old:static:asset-deleted',
    'device-old:static:asset-unpublished',
    'device-draft:static:asset-private',
    'device-new:static:asset-primary',
  ])
    await assert.rejects(
      data.getMiniWallpaper(id, options(''), 'https://phwalls.com', db),
      (e) => e.status === 404,
    );
  const row = await data.getMiniWallpaper(
    'device-old:dynamic:asset-live',
    options(''),
    'https://phwalls.com',
    db,
  );
  assert.equal(row.data.collectionId, 'device-old:dynamic');
  assert.equal(row.data.canSaveToAlbum, true);
  assert.equal(Object.hasOwn(row.data, 'origin_key'), false);
});
