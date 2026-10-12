import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createTsLoader } from './load-ts.mjs';
import { sqliteD1 } from './sqlite-d1.mjs';
const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
function routes(db, overrides = {}) {
  const load = createTsLoader({
    '@cloudflare/next-on-pages': { getOptionalRequestContext: () => undefined },
    ...overrides,
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
  assert.match(response.headers.get('server-timing'), /mini;dur=\d+(\.\d+)?/);
  const body = await response.json();
  assert.equal(body.pagination.total, 3);
  assert.equal(body.data[0].id, 'device-new:static');
  assert.equal(body.meta.language, 'zh');
  assert.equal(Object.hasOwn(body.data[0], 'origin_key'), false);
});

function edgeRoutes(t, db) {
  const previousEnvironment = process.env.NODE_ENV;
  const previousCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  process.env.NODE_ENV = 'production';
  t.after(() => {
    if (previousEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnvironment;
    if (previousCaches) Object.defineProperty(globalThis, 'caches', previousCaches);
    else delete globalThis.caches;
  });
  let now = 0;
  let context;
  let pending = [];
  const entries = new Map();
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: {
    default: {
      async match(request) {
        const entry = entries.get(request.url);
        return entry && entry.expires > now ? entry.response.clone() : undefined;
      },
      async put(request, response) {
        const ttl = Number(response.headers.get('cache-control').match(/max-age=(\d+)/)[1]);
        entries.set(request.url, { response: response.clone(), expires: now + ttl * 1000 });
      },
    },
  } });
  const r = routes(db, {
    '@cloudflare/next-on-pages': { getOptionalRequestContext: () => ({ ctx: context }) },
    'next/headers': { headers: async () => new Headers({ host: 'phwalls.com' }) },
  });
  return {
    advance(milliseconds) { now += milliseconds; },
    async get(route, query = '', id, headers = {}) {
      pending = [];
      context = { waitUntil(promise) { pending.push(promise); } };
      const response = await r[route].GET(
        new NextRequest(`https://phwalls.com/api/public/mini/v1/${route}?${query}`, { headers }),
        { params: Promise.resolve({ id }) },
      );
      await Promise.all(pending);
      return { status: response.status, body: await response.json(), headers: response.headers };
    },
  };
}

test('edge list cache reuses normalized queries and expires after 60 seconds', async (t) => {
  const db = sqliteD1(t);
  const edge = edgeRoutes(t, db);
  const first = await edge.get('collections', 'kind=phone&brand=Samsung&pageSize=1');
  assert.equal(first.body.pagination.total, 3);
  db.seed([{ sql: "UPDATE w_devices SET status='unpublished' WHERE id='device-new'" }]);
  const hit = await edge.get('collections', 'pageSize=1&brand=samsung&kind=phone&lang=zh&page=1');
  assert.deepEqual(hit.body, first.body);
  assert.equal(hit.headers.get('cache-control'), 'no-store');
  const refreshed = await edge.get('collections', 'kind=phone&brand=samsung&pageSize=1', undefined, { 'Cache-Control': 'no-cache' });
  assert.equal(refreshed.body.pagination.total, 2);
  edge.advance(60000);
  const expired = await edge.get('collections', 'kind=phone&brand=samsung&pageSize=1');
  assert.equal(expired.body.pagination.total, 2);
  assert.equal(expired.body.data[0].id, 'device-sept:static');
});

test('edge cache keeps route, language, filters, search and pagination separate', async (t) => {
  const edge = edgeRoutes(t, sqliteD1(t));
  const phone = await edge.get('collections', 'kind=phone&pageSize=1');
  assert.equal(phone.body.data[0].id, 'device-new:static');
  const second = await edge.get('collections', 'kind=phone&pageSize=1&page=2');
  assert.equal(second.body.data[0].id, 'device-sept:static');
  const larger = await edge.get('collections', 'kind=phone&pageSize=2');
  assert.equal(larger.body.data.length, 2);
  const live = await edge.get('collections', 'kind=live');
  assert.equal(live.body.data[0].id, 'device-old:dynamic');
  const search = await edge.get('collections', 'kind=phone&q=S25');
  assert.deepEqual(search.body.data.map((row) => row.id), ['device-old:static']);
  const unknown = await edge.get('collections', 'kind=phone&brand=empty');
  assert.deepEqual(unknown.body.data, []);
  const english = await edge.get('collections', 'kind=phone&q=S25&lang=en');
  assert.equal(english.body.data[0].name, 'Galaxy S25');
  const brands = await edge.get('brands', 'kind=phone');
  assert.equal(brands.body.data[0].slug, 'samsung');
});

test('brand statistics reuse cache while collection and wallpaper checks stay live', async (t) => {
  const db = sqliteD1(t);
  const edge = edgeRoutes(t, db);
  const first = await edge.get('brands', 'kind=phone');
  assert.equal(first.body.data[0].wallpaperCount, 4);
  await edge.get('collections/[id]', '', 'device-old:static');
  await edge.get('wallpapers/[id]', '', 'device-old:static:asset-primary');
  db.seed([{ sql: "UPDATE w_devices SET status='unpublished' WHERE id='device-old'" }]);
  assert.deepEqual((await edge.get('brands', 'kind=phone&page=2')).body, first.body);
  assert.equal((await edge.get('collections/[id]', '', 'device-old:static')).status, 404);
  assert.equal((await edge.get('wallpapers/[id]', '', 'device-old:static:asset-primary')).status, 404);
});

test('edge caching never stores database failures or skips parameter validation', async (t) => {
  const db = sqliteD1(t);
  const edge = edgeRoutes(t, db);
  const batch = db.batch;
  db.batch = async () => { throw new Error('Database temporarily unavailable'); };
  t.mock.method(console, 'error', () => {});
  assert.equal((await edge.get('collections', 'kind=phone')).status, 500);
  db.batch = batch;
  assert.equal((await edge.get('collections', 'kind=phone')).status, 200);
  assert.equal((await edge.get('collections', 'kind=phone&page=0')).status, 400);
});

test('unavailable edge cache falls back to live D1 without failing the endpoint', async (t) => {
  const db = sqliteD1(t);
  const edge = edgeRoutes(t, db);
  t.mock.method(console, 'error', () => {});
  globalThis.caches.default.match = async () => { throw new Error('Cache unavailable'); };
  const first = await edge.get('collections', 'kind=phone');
  assert.equal(first.status, 200);
  assert.equal(first.body.pagination.total, 3);
  db.seed([{ sql: "UPDATE w_devices SET status='unpublished' WHERE id='device-new'" }]);
  assert.equal((await edge.get('collections', 'kind=phone')).body.pagination.total, 2);
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
