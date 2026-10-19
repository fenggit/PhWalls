import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = fileURLToPath(new URL('../', import.meta.url));
const { NextRequest } = require('next/server');

test('sitemap contains each localized D1 canonical URL only once even with a legacy JSON setting', async (t) => {
  const f = fixture({ dataSource: 'json' }); t.after(() => f.sqlite.close());
  f.add('database-only', 'samsung');
  const sitemap = await f.load(`${root}src/app/sitemap.ts`).default();
  assert.equal(new Set(sitemap.map(entry => entry.url)).size, sitemap.length);
  assert.ok(sitemap.some(entry => entry.url.endsWith('/wallpapers/samsung/device-database-only')));
});

test('D1 original dimensions reach static, live and desktop wallpaper list items', async (t) => {
  const f = fixture(); t.after(() => f.sqlite.close());
  for (const [id, brand, media, width, height] of [
    ['phone', 'samsung', 'static', 1440, 3200],
    ['video', 'samsung', 'dynamic', 1080, 2400],
    ['desktop', 'microsoft-windows', 'static', 3840, 2160],
  ]) {
    f.add(id, brand);
    f.sqlite.prepare('UPDATE w_wallpapers SET width=?,height=?,media_type=? WHERE device_id=?').run(width, height, media, id);
    const collection = await f.service.loadDbCollection(brand, `device-${id}`, 'en', media);
    assert.equal(collection.item[0].width, width);
    assert.equal(collection.item[0].height, height);
    const React = require('react');
    const Grid = f.load(`${root}src/components/DeviceWallpaperGrid.tsx`).default;
    const html = require('react-dom/server').renderToStaticMarkup(React.createElement(Grid, { category: brand, deviceData: collection }));
    assert.ok(html.includes(`${width} × ${height}`), `${id}: original resolution is rendered before images load`);
  }
});

test('missing and invalid dimensions are hidden in all five languages', async (t) => {
  for (const language of ['en', 'zh', 'ja', 'vi', 'zh-hant']) {
    const f = fixture({ language }); t.after(() => f.sqlite.close());
    f.add('missing-size', 'samsung');
    const collection = await f.service.loadDbCollection('samsung', 'device-missing-size', language);
    const React = require('react');
    const Grid = f.load(`${root}src/components/DeviceWallpaperGrid.tsx`).default;
    for (const [width, height] of [[null, null], [0, 2400], [-1, 2400], [1080, null]]) {
      collection.item[0].width = width; collection.item[0].height = height;
      const html = require('react-dom/server').renderToStaticMarkup(React.createElement(Grid, { category: 'samsung', deviceData: collection }));
      assert.ok(!html.includes(' × '));
      for (const label of ['分辨率未知', 'Resolution unknown', '解像度不明', 'Chưa rõ độ phân giải', '解析度未知']) assert.ok(!html.includes(label));
    }
  }
});

test('database-only search keeps stable slugs, localized names, media types and published asset keywords', async (t) => {
  const f = fixture(); t.after(() => f.sqlite.close());
  f.add('renamed', 'samsung');
  f.add('hidden', 'samsung', { status: 'draft' });
  f.sqlite.exec(`UPDATE w_devices SET device_name='New name',device_slug='original-url' WHERE id='renamed';
    UPDATE w_wallpapers SET name='HTC U11+',tags='["special keyword"]' WHERE device_id='renamed';
    INSERT INTO w_wallpapers (id,device_id,name,mime_type,origin_key,file_format,media_type,category,status,create_date,updated_date)
      VALUES ('live','renamed','motion','video/mp4','live/movie.mp4','mp4','dynamic','phone','published',2,2),
        ('draft','renamed','private keyword','image/png','draft.png','png','static','phone','draft',3,3);`);
  const entries = await f.service.loadDbSearchIndex('en');
  assert.equal(entries.length, 2);
  assert.ok(entries.every(entry => entry.slug === 'original-url' && entry.name === 'New name' && entry.count === 1));
  assert.ok(entries.find(entry => !entry.live).keywords.includes('HTC U11+'));
  assert.ok(entries.find(entry => !entry.live).keywords.includes('special keyword'));
  assert.ok(entries.every(entry => !entry.keywords.includes('private keyword')));
  const route = f.load(`${root}src/app/api/public/search/route.ts`);
  const response = await route.GET(new NextRequest('https://phwalls.test/api/public/search?lang=en'));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).length, 2);
  assert.equal((await route.GET(new NextRequest('https://phwalls.test/api/public/search?lang=invalid'))).status, 400);
  f.sqlite.exec("UPDATE w_wallpapers SET deletion_state='pending' WHERE id='live'");
  assert.equal((await f.service.loadDbSearchIndex('en')).length, 1);
  f.sqlite.exec("INSERT INTO w_collection_deletions(device_id,media_type,deletion_state,lease_token,updated_date) VALUES('renamed','static','pending','test',1)");
  assert.equal((await f.service.loadDbSearchIndex('en')).length, 0);
});

test('D1 search errors return a service error without leaking database details or local fallback data', async (t) => {
  const f = fixture({ failingDb: true, dataSource: 'json' }); t.after(() => f.sqlite.close());
  const route = f.load(`${root}src/app/api/public/search/route.ts`);
  const response = await route.GET(new NextRequest('https://phwalls.test/api/public/search?lang=en'));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(await response.text(), '{"error":"Search unavailable"}');
});

test('live landing pages and sitemap use the new language-specific canonical paths', async (t) => {
  for (const language of ['en', 'zh', 'ja', 'vi', 'zh-hant']) {
    const f = fixture({ language }); t.after(() => f.sqlite.close());
    f.add('s25', 'samsung');
    f.sqlite.exec(`UPDATE w_wallpapers SET media_type='dynamic',mime_type='video/mp4'`);
    const home = f.load(`${root}src/app/live-wallpapers/page.tsx`);
    const category = f.load(`${root}src/app/live-wallpapers/[category]/page.tsx`);
    assert.equal((await home.generateMetadata()).alternates.canonical, `https://phwalls.com/${language}/live-wallpapers`);
    assert.equal((await category.generateMetadata({ params: Promise.resolve({ category: 'samsung' }) })).alternates.canonical,
      `https://phwalls.com/${language}/live-wallpapers/samsung`);
    const sitemap = await f.load(`${root}src/app/sitemap.ts`).default();
    assert.ok(sitemap.some(entry => entry.url === `https://phwalls.com/${language}/live-wallpapers`));
    assert.ok(sitemap.some(entry => entry.url === `https://phwalls.com/${language}/live-wallpapers/samsung`));
    assert.ok(!sitemap.some(entry => /\/(?:en|zh|ja|vi|zh-hant)\/live(?:\/samsung)?$/.test(entry.url)));
  }
});

test('design metadata contains the brand only once in all five languages', async (t) => {
  for (const language of ['en', 'zh', 'ja', 'vi', 'zh-hant']) {
    const f = fixture({ language }); t.after(() => f.sqlite.close());
    const metadata = await f.load(`${root}src/app/design/layout.tsx`).generateMetadata();
    assert.equal((metadata.title.match(/PhWalls/g) || []).length, 1);
    assert.equal(metadata.openGraph.title, metadata.title);
    assert.equal(metadata.twitter.title, metadata.title);
  }
});

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

test('all site services read D1 even when a legacy JSON data-source setting remains', async (t) => {
  const f = fixture({ dataSource: 'json' }); t.after(() => f.sqlite.close());
  f.add('still', 'samsung'); f.add('video', 'samsung'); f.add('desktop', 'microsoft-windows');
  f.sqlite.exec("UPDATE w_wallpapers SET media_type='dynamic',mime_type='video/mp4' WHERE device_id='video'");
  const phones = f.load(`${root}src/lib/wallpaper-data-server.ts`);
  const live = f.load(`${root}src/lib/live-data-server.ts`);
  const desktops = f.load(`${root}src/lib/desktop-data-server.ts`);
  assert.equal((await phones.loadWallpaperCollections('samsung')).length, 1);
  assert.equal((await phones.loadWallpaperCollectionIndex('samsung')).length, 2);
  assert.equal((await phones.loadWallpaperCollection('samsung', 'device-still')).deviceId, 'still');
  assert.equal((await live.loadLiveCollection('samsung', 'device-video')).deviceId, 'video');
  assert.equal((await live.loadLiveIndex()).samsung.length, 1);
  assert.equal((await desktops.loadDesktopWallpaperCollection('microsoft-windows', 'device-desktop')).deviceId, 'desktop');
  const home = await f.load(`${root}src/lib/home-index.ts`).getHomeCollectionsByCategory('en');
  assert.equal(home.samsung.length, 2);
  assert.equal(await f.service.isPublishedWallpaperKey('samsung/still/origin/still.png', true), true);
  assert.equal(await f.service.isPublishedWallpaperKey('not-in-database.png', true), false);
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


function fixture({ production = false, dataSource = 'd1', failingDb = false, sameRequest = false, r2Failure = true, language = 'zh', jsonOverrides = {} } = {}) {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of ['0001_wallpaper_admin', '0006_wallpaper_deletion_state', '0007_deleted_wallpaper_files', '0008_device_descriptions', '0009_device_description_name', '0010_device_i18n', '0011_public_wallpaper_query_indexes', '0012_collection_media_scope', '0013_device_deletion_state', '0014_collection_deletion_state']) {
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
  const env = { DB: db, WALLPAPER_DATA_SOURCE: dataSource, API_MONITOR_ENABLED: 'false' };
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
      module, exports: module.exports, Request, Response, Headers, URL, TextEncoder, TextDecoder, Error, performance,
      process: { env: { NODE_ENV: production ? 'production' : 'development' } },
      caches: { default: edgeCache },
      console: { error: (...args) => logs.push(args), warn: (...args) => logs.push(args) },
      require(specifier) {
        if (specifier === 'server-only') return {};
        if (specifier === './HomeLanding') return load(`${root}src/app/home/v1/HomeLanding.tsx`);
        if (specifier === '@/components/LiveWallpaperCollectionCard') return load(`${root}src/components/LiveWallpaperCollectionCard.tsx`);
        if (['@/components/Header', '@/components/Footer', '@/components/ShareRegistration', '@/components/WallpaperPreviewDownload'].includes(specifier)) return { default: () => null, __esModule: true };
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

test('collection index preserves media covers and field-level language fallback in one query', async (t) => {
  const f = fixture(); t.after(() => f.sqlite.close());
  f.add('mixed', 'samsung'); f.add('other', 'xiaomi');
  f.sqlite.exec(`INSERT INTO w_wallpapers(id,device_id,name,mime_type,size_bytes,origin_key,compress_key,file_format,media_type,category,is_primary,status,create_date,updated_date)
    VALUES ('static-cover','mixed','primary','image/png',2048,'primary.png','primary.webp','png','static','phone',1,'published',10,10),
      ('motion','mixed','motion','video/mp4',1024,'motion.mp4','motion.webp','mp4','dynamic','phone',1,'published',2,2);
    INSERT INTO w_device_i18n(id,device_id,language,display_name,seo_title,description,create_date,updated_date)
    VALUES ('en','mixed','en','English name','English SEO','English description',1,1),
      ('zh','mixed','zh',NULL,'中文标题',NULL,1,1);
    INSERT INTO w_live_device_i18n(id,device_id,language,display_name,description,create_date,updated_date)
    VALUES ('live-en','mixed','en','English motion','Motion description',1,1),
      ('live-zh','mixed','zh','中文动态','动态描述',1,1);`);
  for (const language of ['en', 'zh', 'ja', 'vi', 'zh-hant']) {
    for (const media of [null, 'static', 'dynamic']) {
      const before = f.calls.length;
      const index = await f.service.loadDbIndex(['samsung', 'missing'], language, media);
      assert.equal(f.calls.length - before, 1);
      assert.equal(index.missing.length, 0);
      assert.equal(index.samsung.length, media ? 1 : 2);
      for (const collection of index.samsung) {
        if (collection.mediaType === 'static') {
          assert.equal(collection.count, 2);
          assert.equal(collection.item[0].name, 'primary');
          assert.equal(collection.name, 'English name');
          assert.equal(collection.description, 'English description');
          assert.equal(collection.seoTitle, language === 'zh' ? '中文标题' : language === 'en' ? 'English SEO' : null);
        } else {
          assert.equal(collection.count, 1);
          assert.equal(collection.item[0].name, 'motion');
          assert.equal(collection.name, language === 'zh' ? '中文动态' : 'English motion');
        }
      }
    }
  }
});

test('collection index preserves legacy-schema results with substantially less SQLite work', async (t) => {
  const f = fixture(); t.after(() => f.sqlite.close());
  for (let i = 0; i < 80; i++) f.add(String(i), i % 2 ? 'samsung' : 'xiaomi');
  f.sqlite.exec(`WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM seq WHERE n<24)
    INSERT INTO w_wallpapers(id,device_id,name,mime_type,origin_key,compress_key,file_format,media_type,category,status,create_date,updated_date)
    SELECT 'extra-' || d.id || '-' || n, d.id, 'extra-' || n,
      CASE WHEN n%3=0 THEN 'video/mp4' ELSE 'image/png' END,
      'origin/' || d.id || '/' || n, 'compress/' || d.id || '/' || n,
      CASE WHEN n%3=0 THEN 'mp4' ELSE 'png' END,
      CASE WHEN n%3=0 THEN 'dynamic' ELSE 'static' END, 'phone', 'published', n+1, n+1
    FROM w_devices d CROSS JOIN seq;
    DROP TABLE w_collection_deletions;`);
  await f.service.loadDbIndex(['samsung'], 'zh');
  const legacy = `WITH ranked AS (
    SELECT w.device_id,w.media_type,w.name,w.mime_type,w.size_bytes,w.origin_key,w.compress_key,w.tags,
      COUNT(*) OVER (PARTITION BY w.device_id,w.media_type) AS count,
      ROW_NUMBER() OVER (PARTITION BY w.device_id,w.media_type ORDER BY w.is_primary DESC,w.create_date,w.name) AS rank
    FROM w_devices d JOIN w_wallpapers w ON w.device_id=d.id
    WHERE d.brand_name IN (SELECT value FROM json_each(?)) AND d.status='published' AND w.status='published'
      AND (? IS NULL OR w.media_type=?))
    SELECT d.id,d.brand_name,d.device_name,d.device_slug,d.release_date,
      COALESCE(local.display_name,live_local.display_name,english.display_name,live_english.display_name,d.device_name) AS display_name,
      COALESCE(local.seo_title,live_local.seo_title) AS seo_title,
      COALESCE(local.description,live_local.description,english.description,live_english.description) AS description,
      w.count,w.media_type,w.name,w.mime_type,w.size_bytes,w.origin_key,w.compress_key,w.tags
    FROM w_devices d JOIN ranked w ON w.device_id=d.id AND w.rank=1
    LEFT JOIN w_device_i18n local ON local.device_id=d.id AND local.language=? AND w.media_type='static'
    LEFT JOIN w_device_i18n english ON english.device_id=d.id AND english.language='en' AND w.media_type='static'
    LEFT JOIN w_live_device_i18n live_local ON live_local.device_id=d.id AND live_local.language=? AND w.media_type='dynamic'
    LEFT JOIN w_live_device_i18n live_english ON live_english.device_id=d.id AND live_english.language='en' AND w.media_type='dynamic'
    WHERE d.status='published' ORDER BY d.release_date DESC,d.device_name,w.media_type DESC`;
  const directory = mkdtempSync(join(tmpdir(), 'phwalls-read-query-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const snapshot = join(directory, 'fixture.sqlite');
  f.sqlite.prepare('VACUUM INTO ?').run(snapshot);
  const measured = JSON.parse(execFileSync('python3', ['-c', `
import sqlite3,json,sys
c=sqlite3.connect(sys.argv[1]);statements=json.load(sys.stdin);results=[]
for statement in statements:
 steps=[0]
 def tick():
  steps[0]+=100
  return 0
 c.set_progress_handler(tick,100)
 rows=c.execute(statement['sql'],statement['values']).fetchall()
 c.set_progress_handler(None,0)
 results.append({'steps':steps[0],'rows':rows})
print(json.dumps(results))
`, snapshot], { encoding: 'utf8', input: JSON.stringify([
    { sql: legacy, values: ['["samsung"]', null, null, 'zh', 'zh'] }, f.calls[0],
  ]) }));
  assert.deepEqual(measured[1].rows, measured[0].rows);
  assert.ok(measured[1].steps < measured[0].steps * 0.75,
    `SQLite work must drop by at least 25%: ${measured[0].steps} -> ${measured[1].steps}`);
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
