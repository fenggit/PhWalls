import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = fileURLToPath(new URL('../', import.meta.url));
const { NextRequest } = require('next/server');

test('live detail metadata and content use the independently authored localized SEO copy', async (t) => {
  const f = fixture(); t.after(() => f.sqlite.close());
  f.add('s25', 'samsung');
  f.sqlite.exec(`UPDATE w_devices SET device_name='Samsung Galaxy S25',device_slug='samsung-galaxy-s25' WHERE id='s25';
    UPDATE w_wallpapers SET media_type='dynamic',mime_type='video/mp4' WHERE device_id='s25';
    INSERT INTO w_live_device_i18n (id,device_id,language,display_name,seo_title,description,create_date,updated_date)
      VALUES ('live-copy','s25','zh','三星 Galaxy S25','三星 Galaxy S25动态壁纸免费下载','播放视频预览，免费下载原始 MP4 动态壁纸。',1,1);`);
  const route = f.load(`${root}src/app/live/wallpapers/[category]/[slug]/page.tsx`);
  const props = { params: Promise.resolve({category:'samsung',slug:'samsung-galaxy-s25'}) };
  const metadata = await route.generateMetadata(props);
  assert.equal(metadata.title, '三星 Galaxy S25动态壁纸免费下载 | PhWalls');
  assert.equal(metadata.description, '播放视频预览，免费下载原始 MP4 动态壁纸。');
  const page = await route.default(props);
  assert.equal(page.props.children[1].props.deviceData.seoTitle, '三星 Galaxy S25动态壁纸免费下载');
});

test('home and brand cards preserve dynamic media labels, play indicators and detail destinations', async (t) => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  for (const [language, label] of [['en', 'Live wallpapers'], ['zh', '动态壁纸'], ['ja', 'ライブ壁紙'], ['vi', 'Hình nền động'], ['zh-hant', '動態桌布']]) {
    const f = fixture({ language }); t.after(() => f.sqlite.close());
    f.add('iqoo16', 'iqoo', { date: '2026-09-29' });
    f.add('static', 'iqoo', { date: '2026-09-28' });
    f.sqlite.exec(`UPDATE w_devices SET device_name = 'iQOO 16', device_slug = 'iqoo-16' WHERE id = 'iqoo16';
      UPDATE w_wallpapers SET mime_type = 'video/mp4', media_type = 'dynamic', origin_key = 'live/iQOO/iQOO 16/origin/movie.mp4',
      compress_key = 'live/iQOO/iQOO 16/compress/movie.webp' WHERE device_id = 'iqoo16';`);
    const element = await f.load(`${root}src/app/home/v1/HomePage.tsx`).default();
    assert.equal(element.props.latest[0].isLive, true);
    assert.equal(element.props.latest[0].href, '/live/wallpapers/iqoo/iqoo-16');
    assert.equal(element.props.latest[1].isLive, false);
    assert.equal(element.props.latest[1].href, '/wallpapers/iqoo/device-static');
    const home = renderToStaticMarkup(element);
    assert.ok(home.includes(`iQOO 16 ${label}`), `${language}: dynamic homepage title`);
    assert.ok(home.includes('lucide-play'), `${language}: homepage play indicator`);
    const brand = await f.load(`${root}src/app/[brand]/page.tsx`).default({ params: Promise.resolve({ brand: 'iqoo' }) });
    const html = renderToStaticMarkup(brand);
    assert.ok(html.includes(`iQOO 16 ${label}`), `${language}: dynamic brand title`);
    assert.ok(html.includes('lucide-play'), `${language}: brand play indicator`);
    assert.ok(html.includes(`/${language}/live/wallpapers/iqoo/iqoo-16`), `${language}: dynamic brand destination`);
  }
});

test('a model with static and dynamic wallpapers produces two independent recent cards and details', async (t) => {
  const f = fixture(); t.after(() => f.sqlite.close());
  f.add('iqoo16', 'iqoo', { date: '2026-09-29' });
  f.sqlite.exec(`UPDATE w_devices SET device_name = 'iQOO 16', device_slug = 'iqoo-16' WHERE id = 'iqoo16';
    INSERT INTO w_wallpapers (id,device_id,name,mime_type,size_bytes,origin_key,compress_key,file_format,media_type,category,is_primary,status,create_date,updated_date)
    VALUES ('motion1','iqoo16','motion1','video/mp4',2048,'live/iQOO/iQOO 16/origin/movie.mp4','live/iQOO/iQOO 16/compress/movie.webp','mp4','dynamic','phone',1,'published',2,2),
      ('motion2','iqoo16','motion2','video/mp4',2048,'live/iQOO/iQOO 16/origin/movie2.mp4','live/iQOO/iQOO 16/compress/movie2.webp','mp4','dynamic','phone',0,'published',3,3);`);
  const page = await f.load(`${root}src/app/home/v1/HomePage.tsx`).default();
  assert.equal(page.props.latest.length, 2, 'both categories must survive even when the video is the primary wallpaper');
  const cards = page.props.latest;
  const still = cards.find(card => !card.isLive);
  const live = cards.find(card => card.isLive);
  assert.equal(still.name, 'iQOO 16');
  assert.equal(live.name, 'iQOO 16');
  assert.equal(still.count, 1);
  assert.equal(live.count, 2);
  assert.equal(still.href, '/wallpapers/iqoo/iqoo-16');
  assert.equal(live.href, '/live/wallpapers/iqoo/iqoo-16');
  assert.notEqual(still.imageUrl, live.imageUrl);
  const staticService = f.load(`${root}src/lib/wallpaper-data-server.ts`);
  const staticDetail = await staticService.loadWallpaperCollection('iqoo', 'iqoo-16', 'zh');
  assert.equal(staticDetail.item.length, 1);
  assert.equal(staticDetail.item[0].type, 'image/png');
  const liveDetail = await f.load(`${root}src/lib/live-data-server.ts`).loadLiveCollection('iqoo', 'iqoo-16', 'zh');
  assert.equal(liveDetail.item.length, 2);
  assert.ok(liveDetail.item.every(item => item.type === 'video/mp4'));
});

test('JSON home and brand indexes keep static and dynamic collections separate', async (t) => {
  const f = fixture({ dataSource: 'json', language: 'en' }); t.after(() => f.sqlite.close());
  const homeService = f.load(`${root}src/lib/home-index.ts`);
  const byCategory = await homeService.getHomeCollectionsByCategory('en');
  const covers = byCategory.samsung.filter(collection => collection.name === 'Samsung Galaxy S25');
  assert.equal(covers.length, 2);
  assert.ok(covers.some(collection => collection.item[0].type.startsWith('image/')));
  assert.ok(covers.some(collection => collection.item[0].type === 'video/mp4'));
  const brand = await f.load(`${root}src/lib/wallpaper-data-server.ts`).loadWallpaperCollectionIndex('samsung', 'en');
  assert.equal(brand.filter(collection => collection.name === 'Samsung Galaxy S25').length, 2);
  const legacyBrand = await f.load(`${root}src/lib/wallpaper-data-server.ts`).loadWallpaperCollectionIndex('lg', 'en');
  assert.equal(legacyBrand.filter(collection => collection.name === 'LG Velvet 2 Pro').length, 2,
    'the dynamic catalog replaces the duplicated legacy video set');
  const still = await f.load(`${root}src/lib/wallpaper-data-server.ts`).loadWallpaperCollection('lg', 'lg-velvet-2-pro', 'en');
  assert.equal(still.item.length, 14);
  assert.ok(still.item.every(item => item.type.startsWith('image/')));
  const staticSitemapEntries = await homeService.getAllHomeCollections();
  assert.ok(staticSitemapEntries.every(({ collection }) => !collection.item[0]?.type.startsWith('video/')));
});

test('mixed JSON sources retain independent phone and desktop media details and authorized playback', async (t) => {
  const collection = { name: 'Original Motion', date: '2026-01-01', item: [
    { name: 'still', type: 'image/png', originPath: 'samsung/Original Motion/origin/still.png', compressPath: 'samsung/Original Motion/compress/still.webp', size: '1KB', tag: '' },
    { name: 'movie', type: 'video/mp4', originPath: 'samsung/Original Motion/origin/movie.mp4', compressPath: 'samsung/Original Motion/compress/movie.webp', size: '1MB', tag: '' },
  ] };
  const f = fixture({ dataSource: 'json', jsonOverrides: {
    'data/samsung.json': [collection], 'data/desktopwalls/microsoft-windows.json': [collection],
    'data/home-index.json': { samsung: [
      { ...collection, count: 1, item: [collection.item[0]] },
      { ...collection, count: 1, item: [collection.item[1]] },
    ] },
  } }); t.after(() => f.sqlite.close());
  const phones = f.load(`${root}src/lib/wallpaper-data-server.ts`);
  const live = f.load(`${root}src/lib/live-data-server.ts`);
  assert.equal((await phones.loadWallpaperCollection('samsung', 'original-motion')).item.length, 1);
  assert.equal((await live.loadLiveCollection('samsung', 'original-motion')).item[0].type, 'video/mp4');
  const index = await live.loadLiveIndex();
  assert.equal(index.samsung.find(collection => collection.slug === 'original-motion').count, 1);
  const desktop = f.load(`${root}src/lib/desktop-data-server.ts`);
  assert.equal((await desktop.loadDesktopWallpaperCollectionIndex('microsoft-windows')).length, 2);
  assert.equal((await desktop.loadDesktopWallpaperCollection('microsoft-windows', 'original-motion')).item[0].type, 'image/png');
  assert.equal((await desktop.loadDesktopWallpaperCollection('microsoft-windows', 'original-motion', 'en', 'dynamic')).item[0].type, 'video/mp4');
  assert.equal(await f.service.isPublishedWallpaperKey(collection.item[1].originPath, true), true);
  assert.equal(await f.service.isPublishedWallpaperKey('samsung/Original Motion/origin/unknown.mp4', true), false);
});

test('all phone JSON categories keep each model media separate with matching source counts', async (t) => {
  const f = fixture({ dataSource: 'json', language: 'en' }); t.after(() => f.sqlite.close());
  const index = await f.load(`${root}src/lib/home-index.ts`).getHomeCollectionsByCategory('en');
  const phones = f.load(`${root}src/lib/wallpaper-data-server.ts`);
  const live = f.load(`${root}src/lib/live-data-server.ts`);
  const media = f.load(`${root}src/lib/wallpaper-media.ts`);
  const { slugifyWallpaperName } = f.load(`${root}src/lib/wallpaper-data.ts`);
  for (const [category, collections] of Object.entries(index)) {
    const staticCollections = await phones.loadWallpaperCollections(category, 'en');
    const dynamicCollections = await live.loadLiveCollections(category, 'en');
    const seen = new Set();
    for (const collection of collections) {
      if (!collection.item.length) continue;
      const type = media.getWallpaperCollectionMedia(collection);
      const slug = collection.slug || slugifyWallpaperName(collection.name);
      const key = `${collection.name}:${type}`;
      assert.ok(!seen.has(key), `${category}/${key}: duplicate card`);
      seen.add(key);
      const detail = type === 'dynamic'
        ? dynamicCollections.find(entry => entry.slug === slug)
        : staticCollections.find(entry => entry.name === collection.name);
      assert.ok(detail, `${category}/${key}: missing detail`);
      assert.equal(detail.item.length, collection.count, `${category}/${key}: incorrect count`);
      assert.ok(detail.item.every(item => item.type.startsWith('video/') === (type === 'dynamic')),
        `${category}/${key}: mixed media detail`);
    }
  }
});

test('all desktop categories keep static and dynamic indexes, covers and details independent', async (t) => {
  const f = fixture(); t.after(() => f.sqlite.close());
  const service = f.load(`${root}src/lib/desktop-data-server.ts`);
  const desktopPaths = f.load(`${root}src/lib/desktop-data.ts`);
  const categories = ['google-os', 'google-chromeos', 'microsoft-surface', 'microsoft-windows', 'omarchy-linux', 'ubuntu'];
  for (const [index, category] of categories.entries()) {
    const id = `desktop-${index}`;
    f.add(id, category);
    f.sqlite.prepare(`UPDATE w_devices SET device_category = 'desktop' WHERE id = ?`).run(id);
    f.sqlite.prepare(`UPDATE w_wallpapers SET category = 'desktop' WHERE device_id = ?`).run(id);
    f.sqlite.prepare(`INSERT INTO w_wallpapers (id,device_id,name,mime_type,origin_key,compress_key,file_format,media_type,category,status,create_date,updated_date)
      VALUES (?,?,'movie','video/mp4',?,?,'mp4','dynamic','desktop','published',2,2)`)
      .run(`motion-${id}`, id, `desktopwalls/${category}/${id}/origin/movie.mp4`, `desktopwalls/${category}/${id}/compress/movie.webp`);
    const collections = await service.loadDesktopWallpaperCollections(category, 'zh');
    assert.equal(collections.length, 2, `${category}: separate collections`);
    assert.ok(collections.every(collection => collection.item.length === 1));
    const slug = `device-${id}`;
    assert.equal((await service.loadDesktopWallpaperCollection(category, slug, 'zh')).item[0].type, 'image/png');
    assert.equal((await service.loadDesktopWallpaperCollection(category, slug, 'zh', 'dynamic')).item[0].type, 'video/mp4');
    assert.notEqual(desktopPaths.buildDesktopWallpaperDetailPath(category, slug),
      desktopPaths.buildDesktopWallpaperDetailPath(category, slug, 'dynamic'));
  }
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const categoryPage = await f.load(`${root}src/app/desktop/[category]/page.tsx`).default({
    params: Promise.resolve({ category: 'microsoft-windows' }),
  });
  const html = renderToStaticMarkup(categoryPage);
  assert.ok(html.includes('/zh/desktop/wallpapers/microsoft-windows/device-desktop-3'));
  assert.ok(html.includes('/zh/desktop/live-wallpapers/microsoft-windows/device-desktop-3'));
  const desktopHome = await f.load(`${root}src/app/desktop/page.tsx`).default();
  assert.equal(Object.keys(desktopHome.props.initialImageUrls).length, 12, 'same-model covers must not overwrite each other');
});

test('desktop live pages have independent canonical URLs, localized copy and video schemas', async (t) => {
  for (const [language, label] of [['en', 'Live wallpapers'], ['zh', '动态壁纸'], ['ja', 'ライブ壁紙'], ['vi', 'Hình nền động'], ['zh-hant', '動態桌布']]) {
    const f = fixture({ language }); t.after(() => f.sqlite.close());
    f.add('windows', 'microsoft-windows');
    f.sqlite.exec(`UPDATE w_wallpapers SET mime_type = 'video/mp4', media_type = 'dynamic', category = 'desktop',
      origin_key = 'desktopwalls/windows/origin/movie.mp4', compress_key = 'desktopwalls/windows/compress/movie.webp'`);
    const route = f.load(`${root}src/app/desktop/live-wallpapers/[category]/[slug]/page.tsx`);
    const props = { params: Promise.resolve({ category: 'microsoft-windows', slug: 'device-windows' }) };
    const metadata = await route.generateMetadata(props);
    assert.ok(metadata.title.toLocaleLowerCase().includes(label.toLocaleLowerCase()));
    assert.ok(metadata.alternates.canonical.endsWith(`/${language}/desktop/live-wallpapers/microsoft-windows/device-windows`));
    const element = await route.default(props);
    const html = require('react-dom/server').renderToStaticMarkup(element);
    assert.ok(html.includes('VideoObject'));
    assert.ok(!html.includes('ImageGallery'));
    const description = await f.load(`${root}src/lib/route-description.ts`).resolveRouteDescription('/desktop/live-wallpapers/microsoft-windows/device-windows', language);
    assert.equal(description, metadata.description);
    const sitemap = await f.load(`${root}src/app/sitemap.ts`).default();
    assert.ok(sitemap.some(entry => entry.url === metadata.alternates.canonical));
    assert.ok(!sitemap.some(entry => entry.url.endsWith('/desktop/wallpapers/microsoft-windows/device-windows')));
  }
});

test('live queries count and select only published dynamic media, with independent cache keys', async (t) => {
  const f = fixture(); t.after(() => f.sqlite.close());
  f.add('mixed', 'samsung'); f.add('static-only', 'samsung');
  f.sqlite.exec(`INSERT INTO w_wallpapers (id,device_id,name,mime_type,size_bytes,origin_key,compress_key,file_format,media_type,category,status,create_date,updated_date)
    VALUES ('live','mixed','motion','video/mp4',2048,'live/Samsung/Mixed/origin/motion.mp4','live/Samsung/Mixed/compress/motion.webp','mp4','dynamic','phone','published',2,2),
    ('draft-live','mixed','draft','video/mp4',2048,'live/Samsung/Mixed/origin/draft.mp4','live/Samsung/Mixed/compress/draft.webp','mp4','dynamic','phone','draft',3,3);`);
  const all = await f.service.loadDbIndex(['samsung']);
  assert.equal(all.samsung.length, 3);
  const live = await f.service.loadDbIndex(['samsung'], 'en', 'dynamic');
  assert.equal(live.samsung.length, 1);
  assert.equal(live.samsung[0].count, 1);
  assert.equal(live.samsung[0].item[0].type, 'video/mp4');
  assert.equal((await f.service.loadDbCollections('samsung', 'en', 'dynamic')).length, 1);
  assert.equal((await f.service.loadDbCollection('samsung', 'device-mixed', 'en', 'dynamic')).item.length, 1);
  assert.equal(await f.service.loadDbCollection('samsung', 'device-static-only', 'en', 'dynamic'), null);
});

test('live JSON fallback localizes all five languages and keeps unpublished videos private', async (t) => {
  const f = fixture({ dataSource: 'json' }); t.after(() => f.sqlite.close());
  const live = f.load(`${root}src/lib/live-data-server.ts`);
  const seo = f.load(`${root}src/lib/live-seo.ts`);
  for (const [language, expectedPrefix] of [['en','Samsung'], ['zh','三星'], ['ja','サムスン'], ['vi','Samsung'], ['zh-hant','三星']]) {
    const collection = await live.loadLiveCollection('samsung', 'samsung-galaxy-s25', language);
    assert.ok(collection.name.startsWith(expectedPrefix));
    assert.equal(collection.item.length, 5);
    const copy = seo.getLiveSeoCopy(language, { category: 'samsung', name: collection.name, count: collection.item.length });
    assert.ok(copy.description.includes('MP4'));
    assert.ok(!copy.description.includes('{'));
    const metadata = seo.buildLiveMetadata(language, '/live/wallpapers/samsung/samsung-galaxy-s25', copy);
    assert.equal(new Set(Object.values(metadata.alternates.languages)).size, 5);
    assert.ok(await f.service.isPublishedWallpaperKey(collection.item[0].originPath, true));
  }
  assert.equal(await live.loadLiveCollection('samsung', 'samsung-thom-browne'), null);
  const draft = JSON.parse(readFileSync(`${root}src/data/livewalls/catalog.json`, 'utf8'))
    .find((entry) => entry.collection.name === 'Samsung Thom Browne');
  assert.equal(draft.status, 'draft');
  assert.equal(await f.service.isPublishedWallpaperKey(draft.collection.item[0].originPath, true), false);
  assert.equal(f.calls.length, 0);
});

function fixture({ production = false, dataSource = 'd1', failingDb = false, sameRequest = false, r2Failure = true, language = 'zh', jsonOverrides = {} } = {}) {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_wallpaper_admin', '0006_wallpaper_deletion_state', '0007_deleted_wallpaper_files', '0008_device_descriptions', '0009_device_description_name', '0010_device_i18n', '0011_public_wallpaper_query_indexes', '0012_collection_media_scope']) {
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
        if (specifier === './HomeLanding') return load(`${root}src/app/home/v1/HomeLanding.tsx`);
        if (specifier === '@/components/LiveWallpaperCollectionCard') return load(`${root}src/components/LiveWallpaperCollectionCard.tsx`);
        if (['@/components/Header', '@/components/Footer', '@/components/ShareRegistration'].includes(specifier)) return { default: () => null, __esModule: true };
        if (specifier === 'next/navigation') return { usePathname: () => `/${language}/desktop`, useSearchParams: () => new URLSearchParams(), notFound: () => { throw new Error('NOT_FOUND'); } };
        if (specifier === 'next/link') return { __esModule: true, default: ({ href, children, prefetch, ...props }) => require('react').createElement('a', { ...props, href }, children) };
        if (specifier === '@/components/LanguageProvider') return { useLanguage: () => ({ language, setLanguage() {}, texts: load(`${root}src/lib/i18n.ts`).getI18nTexts(language) }) };
        if (specifier === '@cloudflare/next-on-pages') return { getOptionalRequestContext: () => ({ env, ctx: sameRequest ? executionContext : { ...executionContext } }) };
        if (specifier === 'next/headers') return { headers: async () => new Headers({ host, 'x-phwalls-lang': language }), cookies: async () => ({ get: () => undefined }) };
        if (specifier === '@/lib/services/r2') return { R2Service: class { getPublicFileUrl(key) {
          if (r2Failure) throw new Error('PRIVATE_R2_ENDPOINT_AND_CREDENTIALS');
          return `https://static.phwalls.test/${key}`;
        } } };
        if (specifier === '@/lib/config/environments') return { getCurrentEnvironment: () => ({ r2: { accessKeyId: 'test-only', secretAccessKey: 'test-only', bucket: 'test', endpoint: 'test', isPrivate: false } }) };
        if (specifier.startsWith('@/') && specifier.endsWith('.json')) return jsonOverrides[specifier.slice(2)] || JSON.parse(readFileSync(`${root}src/${specifier.slice(2)}`, 'utf8'));
        if (specifier.startsWith('@/')) {
          const path = `${root}src/${specifier === '@/types' ? 'types/index' : specifier.slice(2)}`;
          return load(existsSync(`${path}.ts`) ? `${path}.ts` : `${path}.tsx`);
        }
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
