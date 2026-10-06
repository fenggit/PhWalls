import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = fileURLToPath(new URL('../', import.meta.url));
const { NextRequest } = require('next/server');

function fixture({ production = false, dataSource = 'd1', failingDb = false, sameRequest = false, r2Failure = true, language = 'zh' } = {}) {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_wallpaper_admin', '0008_device_descriptions', '0009_device_description_name', '0010_device_i18n', '0011_public_wallpaper_query_indexes']) {
    sqlite.exec(readFileSync(`${root}migrations/${name}.sql`, 'utf8'));
  }
  const calls = [];
  const db = { prepare(sql) {
    if (failingDb) throw new Error('PRIVATE_DATABASE_BINDING_AND_SQL');
    const statement = sqlite.prepare(sql);
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async first() { const result = statement.get(...values) || null; calls.push({ sql, values, rows: result ? 1 : 0 }); return result; },
      async all() { const results = statement.all(...values); calls.push({ sql, values, rows: results.length }); return { results }; },
    };
  } };
  const env = { DB: db, WALLPAPER_DATA_SOURCE: dataSource };
  const entries = new Map();
  let now = 0;
  let host = 'phwalls.test';
  let cacheFails = false;
  let cacheWriteFails = false;
  const pending = [];
  const executionContext = { waitUntil: (promise) => pending.push(promise) };
  const edgeCache = {
    async match(request) {
      if (cacheFails) throw new Error('cache unavailable');
      const hit = entries.get(request.url);
      return hit && hit.expiry > now ? hit.response.clone() : undefined;
    },
    async put(request, response) {
      if (cacheFails || cacheWriteFails) throw new Error('cache unavailable');
      const ttl = Number(response.headers.get('cache-control').match(/max-age=(\d+)/)?.[1] || 0);
      entries.set(request.url, { response: response.clone(), expiry: now + ttl * 1000 });
    },
  };
  const modules = new Map();
  const logs = [];
  function load(path) {
    if (modules.has(path)) return modules.get(path).exports;
    const module = { exports: {} };
    modules.set(path, module);
    const source = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    runInNewContext(source, {
      module, exports: module.exports, Request, Response, Headers, URL, TextEncoder, TextDecoder, Error,
      process: { env: { NODE_ENV: production ? 'production' : 'development' } },
      caches: { default: edgeCache },
      console: { error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
      require(specifier) {
        if (specifier === 'server-only') return {};
        if (['@/components/Header', '@/components/Footer', '@/components/ShareRegistration'].includes(specifier)) return { default: () => null, __esModule: true };
        if (specifier === 'next/navigation') return { usePathname: () => `/${language}/desktop` };
        if (specifier === 'next/link') return { __esModule: true, default: ({ href, children, prefetch, ...props }) => require('react').createElement('a', { ...props, href }, children) };
        if (specifier === '@/components/LanguageProvider') return { useLanguage: () => ({ language, setLanguage() {}, texts: load(`${root}src/lib/i18n.ts`).getI18nTexts(language) }) };
        if (specifier === '@cloudflare/next-on-pages') return { getOptionalRequestContext: () => ({ env, ctx: sameRequest ? executionContext : { ...executionContext } }) };
        if (specifier === 'next/headers') return { headers: async () => new Headers({ host }) };
        if (specifier === '@/lib/services/r2') return { R2Service: class { getPublicFileUrl(key) {
          if (r2Failure) throw new Error('PRIVATE_R2_ENDPOINT_AND_CREDENTIALS');
          return `https://static.phwalls.test/${key}`;
        } } };
        if (specifier === '@/lib/config/environments') return { getCurrentEnvironment: () => ({ r2: { accessKeyId: 'test-only', secretAccessKey: 'test-only', bucket: 'test', endpoint: 'test', isPrivate: false } }) };
        if (specifier.startsWith('@/') && specifier.endsWith('.json')) return JSON.parse(readFileSync(`${root}src/${specifier.slice(2)}`, 'utf8'));
        if (specifier.startsWith('@/')) return load(`${root}src/${specifier === '@/types' ? 'types/index' : specifier.slice(2)}.ts`);
        return require(specifier);
      },
    }, { filename: path });
    return module.exports;
  }
  function add(id, brand, { status = 'published', wallpaperStatus = 'published', hasWallpaper = true, date = '2026-01-01' } = {}) {
    sqlite.prepare(`INSERT INTO w_devices (id, brand_name, device_name, device_slug, device_category, release_date, status, create_date, updated_date)
      VALUES (?, ?, ?, ?, 'phone', ?, ?, 1, 1)`).run(id, brand, `Device ${id}`, `device-${id}`, date, status);
    if (hasWallpaper) sqlite.prepare(`INSERT INTO w_wallpapers (id, device_id, name, mime_type, origin_key, compress_key, file_format, media_type, category, status, create_date, updated_date)
      VALUES (?, ?, ?, 'image/png', ?, ?, 'png', 'static', 'phone', ?, 1, 1)`)
      .run(`w-${id}`, id, `${id}.png`, `${brand}/${id}/origin/${id}.png`, `${brand}/${id}/compress/${id}.webp`, wallpaperStatus);
  }
  const service = load(`${root}src/lib/wallpaper-db.ts`);
  return { sqlite, add, service, calls, logs, load,
    setHost: (value) => { host = value; },
    advance: (ms) => { now += ms; },
    failCache: () => { cacheFails = true; },
    failCacheWrites: () => { cacheWriteFails = true; },
    flush: () => Promise.all(pending.splice(0)),
  };
}

test('desktop collection cards and preview affordances both navigate to localized details', (t) => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  for (const language of ['en', 'zh', 'ja', 'vi', 'zh-hant']) {
    const f = fixture({ language }); t.after(() => f.sqlite.close());
    const Home = f.load(`${root}src/app/home/v1/Home.tsx`).default;
    const html = renderToStaticMarkup(React.createElement(Home, {
      contentTabs: [{ type: 'microsoft-windows', title: 'Windows' }],
      navigationTabs: [{ type: 'microsoft-windows', title: 'Windows' }],
      contentCollectionsByCategory: { 'microsoft-windows': [{
        deviceId: 'win-11', name: 'Windows 11', slug: 'windows-11', date: '2026-01-01', count: 20,
        item: [{ name: 'Cover', compressPath: 'desktopwalls/windows/compress/cover.webp', originPath: '', type: 'image/webp', size: '1 KB', tag: '' }],
      }] },
      detailPathPrefix: '/desktop/wallpapers', categoryPathPrefix: '/desktop', forceDesktopCards: true,
    }));
    const expected = `/${language}/desktop/wallpapers/microsoft-windows/windows-11`;
    const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)]
      .filter((match) => match[1].includes(`href="${expected}"`));
    assert.equal(links.length, 2, `${language}: both the card and preview link should open the full collection`);
    assert.ok(links.some((match) => match[2].includes(f.load(`${root}src/lib/i18n.ts`).getI18nTexts(language).preview)));
  }
});

test('D1 cache isolates languages and hosts, expires, and does not cache authorization', async (t) => {
  const f = fixture({ production: true }); t.after(() => f.sqlite.close());
  f.add('1', 'samsung');
  const first = await f.service.loadDbCollection('samsung', 'device-1', 'en');
  await f.flush();
  const count = f.calls.length;
  assert.deepEqual(await f.service.loadDbCollection('samsung', 'device-1', 'en'), JSON.parse(JSON.stringify(first)));
  assert.equal(f.calls.length, count, 'cache hit should avoid D1');
  await f.service.loadDbCollection('samsung', 'device-1', 'zh'); await f.flush();
  assert.ok(f.calls.length > count, 'language must have its own cache');
  f.setHost('preview.phwalls.test');
  const beforeHost = f.calls.length;
  await f.service.loadDbCollection('samsung', 'device-1', 'en'); await f.flush();
  assert.ok(f.calls.length > beforeHost, 'preview must not share production cache');
  f.sqlite.exec("UPDATE w_devices SET status = 'unpublished' WHERE id = '1'");
  assert.equal(await f.service.isPublishedWallpaperKey('samsung/1/origin/1.png', true), false);
  f.advance(61000);
  assert.equal(await f.service.loadDbCollection('samsung', 'device-1', 'en'), null);
});

test('missing records do not persist in the query cache', async (t) => {
  const f = fixture({ production: true }); t.after(() => f.sqlite.close());
  assert.equal(await f.service.loadDbCollection('samsung', 'device-1'), null); await f.flush();
  f.add('1', 'samsung');
  assert.equal((await f.service.loadDbCollection('samsung', 'device-1')).deviceId, '1');
});

test('cache failure and development mode continue to read fresh D1 data', async (t) => {
  for (const production of [false, true]) {
    const f = fixture({ production }); t.after(() => f.sqlite.close());
    f.add('1', 'samsung'); f.failCache();
    assert.equal((await f.service.loadDbCollections('samsung')).length, 1);
    f.sqlite.exec("UPDATE w_devices SET status = 'unpublished'");
    assert.equal((await f.service.loadDbCollections('samsung')).length, 0);
  }
});

test('concurrent queries in the same request share D1 work', async (t) => {
  const f = fixture({ production: true, sameRequest: true }); t.after(() => f.sqlite.close()); f.add('1', 'samsung');
  const results = await Promise.all([
    f.service.loadDbCollection('samsung', 'device-1', 'en'),
    f.service.loadDbCollection('samsung', 'device-1', 'en'),
  ]);
  assert.equal(results[0].deviceId, '1');
  assert.equal(results[1].deviceId, '1');
  assert.equal(f.calls.length, 2, 'one device query and one wallpaper query per request');
});

test('development reads stay fresh when the Cloudflare proxy reuses its execution context', async (t) => {
  const f = fixture({ sameRequest: true }); t.after(() => f.sqlite.close()); f.add('1', 'samsung');
  assert.equal((await f.service.loadDbCollection('samsung', 'device-1')).deviceId, '1');
  f.sqlite.exec("UPDATE w_devices SET status = 'unpublished' WHERE id = '1'");
  assert.equal(await f.service.loadDbCollection('samsung', 'device-1'), null);
});

test('cache write failure preserves the successful query response and subsequent freshness', async (t) => {
  const f = fixture({ production: true }); t.after(() => f.sqlite.close()); f.add('1', 'samsung');
  f.failCacheWrites();
  assert.equal((await f.service.loadDbCollection('samsung', 'device-1')).deviceId, '1'); await f.flush();
  f.sqlite.exec("UPDATE w_devices SET status = 'unpublished' WHERE id = '1'");
  assert.equal(await f.service.loadDbCollection('samsung', 'device-1'), null);
});

test('public query indexes are idempotent and leave existing wallpaper records intact', async (t) => {
  const f = fixture(); t.after(() => f.sqlite.close()); f.add('1', 'samsung');
  const before = f.sqlite.prepare('SELECT * FROM w_wallpapers').all();
  f.sqlite.exec(readFileSync(`${root}migrations/0011_public_wallpaper_query_indexes.sql`, 'utf8'));
  assert.deepEqual(f.sqlite.prepare('SELECT * FROM w_wallpapers').all(), before);
  await f.service.getPublishedWallpaperKeys(['samsung/1/origin/1.png']);
  const plan = f.sqlite.prepare('EXPLAIN QUERY PLAN ' + f.calls[0].sql).all(...f.calls[0].values);
  assert.ok(plan.some((row) => row.detail.includes('idx_w_wallpapers_origin_visibility')));
  assert.ok(plan.some((row) => row.detail.includes('idx_w_wallpapers_compress_visibility')));
});

test('home index filters brands before ranking published wallpapers', async (t) => {
  const f = fixture(); t.after(() => f.sqlite.close());
  f.add('1', 'samsung'); f.add('2', 'xiaomi'); f.add('3', 'samsung', { status: 'draft' });
  const index = await f.service.loadDbIndex(['samsung']);
  assert.equal(index.samsung.length, 1);
  assert.equal(index.samsung[0].count, 1);
  assert.ok(f.calls[0].values.includes('["samsung"]'), 'selected brands must be bound into SQL');
  const plan = f.sqlite.prepare('EXPLAIN QUERY PLAN ' + f.calls[0].sql).all(...f.calls[0].values);
  assert.ok(plan.some((row) => /SEARCH d USING INDEX/.test(row.detail)), 'ranking should start from the selected brands');
});

test('batch signing rejects more than 100 keys without hitting the database', async (t) => {
  const f = fixture(); t.after(() => f.sqlite.close());
  const route = f.load(`${root}src/app/api/files/batch-private-urls/route.ts`);
  const response = await route.POST(new NextRequest('https://phwalls.test/api/files/batch-private-urls', {
    method: 'POST', body: JSON.stringify({ keys: Array.from({ length: 101 }, (_, i) => `samsung/${i}/origin/${i}.png`) }),
  }));
  assert.equal(response.status, 400);
  assert.equal(f.calls.length, 0);
});

test('batch signing failures do not return internal object paths or R2 errors', async (t) => {
  const f = fixture(); t.after(() => f.sqlite.close()); f.add('1', 'samsung');
  const route = f.load(`${root}src/app/api/files/batch-private-urls/route.ts`);
  const response = await route.POST(new NextRequest('https://phwalls.test/api/files/batch-private-urls', {
    method: 'POST', body: JSON.stringify({ keys: ['samsung/1/origin/1.png'] }),
  }));
  assert.equal(response.status, 500);
  assert.ok(!JSON.stringify(await response.json()).includes('PRIVATE_R2'));
});

test('batch signing deduplicates and returns only published keys with one visibility query', async (t) => {
  const f = fixture({ r2Failure: false }); t.after(() => f.sqlite.close());
  f.add('1', 'samsung'); f.add('2', 'samsung', { status: 'draft' });
  f.add('3', 'samsung', { wallpaperStatus: 'unpublished' });
  const route = f.load(`${root}src/app/api/files/batch-private-urls/route.ts`);
  const response = await route.POST(new NextRequest('https://phwalls.test/api/files/batch-private-urls', {
    method: 'POST', body: JSON.stringify({ keys: ['samsung/1/origin/1.png', 'samsung/1/origin/1.png',
      'samsung/1/compress/1.webp', 'samsung/2/origin/2.png', 'samsung/3/origin/3.png', '../origin/secret.png'] }),
  }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(Object.keys(body.urls).sort(), ['samsung/1/compress/1.webp', 'samsung/1/origin/1.png']);
  assert.equal(f.calls.length, 1);
});
