import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createTsLoader } from './load-ts.mjs';
import { sqliteD1 } from './sqlite-d1.mjs';
const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
function routes(db) {
  const load = createTsLoader({
    '@/lib/wallpaper-db': {
      getWallpaperDb() {
        if (!db) throw new Error('D1 binding DB is unavailable');
        return db;
      },
    },
  });
  return Object.fromEntries(
    ['brands', 'collections', 'collections/[id]', 'wallpapers/[id]'].map(
      (route) => [route, load(`src/app/api/public/mini/v1/${route}/route.ts`)],
    ),
  );
}
test('GET list returns public DTOs, stable pagination and no-store headers', async (t) => {
  const db = sqliteD1(t);
  const r = routes(db);
  const response = await r.collections.GET(
    new NextRequest(
      'https://phwalls.com/api/public/mini/v1/collections?kind=phone&pageSize=1',
    ),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  assert.equal(body.pagination.total, 3);
  assert.equal(body.data[0].id, 'device-new:static');
  assert.equal(body.meta.language, 'zh');
  assert.equal(Object.hasOwn(body.data[0], 'origin_key'), false);
});
test('GET detail isolates unpublished IDs and validates identifiers before DB access', async (t) => {
  const db = sqliteD1(t);
  const r = routes(db);
  const missing = await r['wallpapers/[id]'].GET(
    new NextRequest('https://phwalls.com/api/public/mini/v1/wallpapers/x'),
    { params: Promise.resolve({ id: 'device-old:static:asset-deleted' }) },
  );
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error.code, 'NOT_FOUND');
  const invalid = await routes(null)['collections/[id]'].GET(
    new NextRequest('https://phwalls.com/api/public/mini/v1/collections/bad'),
    { params: Promise.resolve({ id: 'bad' }) },
  );
  assert.equal(invalid.status, 400);
  assert.equal(invalid.headers.get('cache-control'), 'no-store');
});
test('missing D1 binding is explicit and never falls back to stale local JSON', async () => {
  const response = await routes(null).brands.GET(
    new NextRequest('https://phwalls.com/api/public/mini/v1/brands'),
  );
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'DATA_SOURCE_UNAVAILABLE');
});
