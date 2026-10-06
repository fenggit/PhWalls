import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = fileURLToPath(new URL('../', import.meta.url));
const migration = `${root}migrations/0008_device_descriptions.sql`;

function fixture(legacyDescription = false, stubs = {}) {
  assert.ok(existsSync(migration), '合集描述表迁移尚未实现');
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  sqlite.exec(readFileSync(`${root}migrations/0001_wallpaper_admin.sql`, 'utf8'));
  sqlite.exec(readFileSync(`${root}migrations/0006_wallpaper_deletion_state.sql`, 'utf8'));
  sqlite.exec(readFileSync(migration, 'utf8'));
  sqlite.prepare(`INSERT INTO w_devices (id, brand_name, device_name, device_slug, device_category,
    create_date, updated_date) VALUES (?, 'test', ?, ?, 'phone', 1, 1)`)
    .run('device-1', 'Device One', 'device-one');
  sqlite.prepare(`INSERT INTO w_devices (id, brand_name, device_name, device_slug, device_category,
    create_date, updated_date) VALUES (?, 'test', ?, ?, 'phone', 1, 1)`)
    .run('device-2', 'Device Two', 'device-two');
  if (legacyDescription) {
    sqlite.exec(`INSERT INTO w_device_desc (id, device_id, "desc", language, create_date, updated_date)
      VALUES ('legacy-desc', 'device-1', 'Existing description', 'en', 10, 20)`);
  }
  const nameMigration = `${root}migrations/0009_device_description_name.sql`;
  if (existsSync(nameMigration)) sqlite.exec(readFileSync(nameMigration, 'utf8'));
  if (legacyDescription) sqlite.exec("UPDATE w_device_desc SET name = 'Existing authored SEO title' WHERE id = 'legacy-desc'");
  sqlite.exec(readFileSync(`${root}migrations/0010_device_i18n.sql`, 'utf8'));
  const db = {
    prepare(sql) {
      const statement = sqlite.prepare(sql);
      let values = [];
      return {
        bind(...args) { values = args; return this; },
        async first() { return statement.get(...values) || null; },
        async all() { return { results: statement.all(...values) }; },
        async run() { return { meta: statement.run(...values) }; },
      };
    },
  };
  const env = { DB: db, WALLPAPER_DATA_SOURCE: 'd1', ADMIN_SESSION_SECRET: 'test-only-session-secret-with-32-characters' };
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const source = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    runInNewContext(source, {
      module, exports: module.exports, crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob,
      Date, URL, Error, process: { env: { NODE_ENV: 'production' } },
      require(specifier) {
        if (specifier in stubs) return stubs[specifier];
        if (specifier === 'server-only') return {};
        if (specifier === '@cloudflare/next-on-pages') return { getOptionalRequestContext: () => ({ env }) };
        if (specifier.endsWith('.json') && specifier.startsWith('@/')) return JSON.parse(readFileSync(`${root}src/${specifier.slice(2)}`, 'utf8'));
        if (specifier.startsWith('@/')) {
          return load(`${root}src/${specifier === '@/types' ? 'types/index' : specifier.slice(2)}.ts`);
        }
        return require(specifier);
      },
    }, { filename: path });
    return module.exports;
  }
  return { sqlite, load, service: load(`${root}src/lib/admin-device-i18n.ts`) };
}

test('saves five languages independently and keeps record identity on update', async () => {
  const { service, sqlite } = fixture();
  try {
    for (const language of ['en', 'zh', 'ja', 'vi', 'zh-hant']) {
      await service.saveAdminDeviceI18n({ device_id: 'device-1', language, display_name: `  ${language} 名称  `, seo_title: `${language} 标题`, description: `${language} 描述` });
    }
    const rows = await service.listAdminDeviceI18n('device-1');
    assert.equal(rows.length, 5);
    const before = rows.find((row) => row.language === 'zh');
    assert.equal(before.display_name, 'zh 名称');
    const after = await service.saveAdminDeviceI18n({ device_id: 'device-1', language: 'zh', display_name: '设备一', seo_title: '  ', description: null });
    assert.equal(after.id, before.id);
    assert.equal(after.create_date, before.create_date);
    assert.ok(after.updated_date >= before.updated_date);
    assert.equal(after.seo_title, null);
    assert.equal(after.description, null);
    assert.equal((await service.listAdminDeviceI18n('device-1')).find((row) => row.language === 'en').seo_title, 'en 标题');
    assert.equal(sqlite.prepare("SELECT device_name FROM w_devices WHERE id = 'device-1'").get().device_name, 'Device One');
    assert.equal(sqlite.prepare("SELECT device_slug FROM w_devices WHERE id = 'device-1'").get().device_slug, 'device-one');
  } finally { sqlite.close(); }
});

test('rejects malformed values, empty translations, unsupported languages and missing devices', async () => {
  const { service, sqlite } = fixture();
  try {
    const valid = { device_id: 'device-1', language: 'en', display_name: 'Device One' };
    for (const patch of [{ language: 'fr' }, { language: 'zh-Hant' }, { language: null },
      { device_id: 'missing' }, { display_name: '   ' }, { display_name: 42 }, { display_name: 'x'.repeat(201) },
      { description: 42 }, { description: 'x'.repeat(5001) }, { seo_title: 42 }, { seo_title: 'x'.repeat(201) }]) {
      await assert.rejects(() => service.saveAdminDeviceI18n({ ...valid, ...patch }));
    }
    await assert.rejects(() => service.listAdminDeviceI18n('missing'));
    await assert.rejects(() => service.deleteAdminDeviceI18n({ device_id: 'device-1', language: 'fr' }));
    assert.equal((await service.listAdminDeviceI18n('device-1')).length, 0);
  } finally { sqlite.close(); }
});

test('supports each field alone and deletes only the selected language', async () => {
  const { service, sqlite } = fixture();
  try {
    const row = await service.saveAdminDeviceI18n({ device_id: 'device-1', language: 'zh', display_name: '  设备一  ' });
    assert.equal(row.display_name, '设备一');
    assert.equal(row.seo_title, null);
    assert.equal(row.description, null);
    await service.saveAdminDeviceI18n({ device_id: 'device-1', language: 'en', description: 'Description' });
    await service.saveAdminDeviceI18n({ device_id: 'device-1', language: 'ja', seo_title: '壁紙' });
    await service.deleteAdminDeviceI18n({ device_id: 'device-1', language: 'zh' });
    await service.deleteAdminDeviceI18n({ device_id: 'device-1', language: 'zh' });
    assert.deepEqual(Array.from(await service.listAdminDeviceI18n('device-1'), (row) => row.language), ['en', 'ja']);
  } finally { sqlite.close(); }
});

test('database enforces partial content, language, uniqueness, foreign keys and cascading deletion', () => {
  const { sqlite } = fixture();
  try {
    const insert = sqlite.prepare(`INSERT INTO w_device_i18n
      (id,device_id,display_name,language,create_date,updated_date) VALUES (?,?,?,?,1,1)`);
    insert.run('i18n-1', 'device-1', 'Device One', 'en');
    assert.throws(() => insert.run('i18n-2', 'device-1', 'Duplicate', 'en'), /UNIQUE/);
    assert.throws(() => insert.run('i18n-3', 'device-1', 'French', 'fr'), /CHECK/);
    assert.throws(() => insert.run('i18n-4', 'missing', 'Missing', 'en'), /FOREIGN KEY/);
    assert.throws(() => insert.run('i18n-5', 'device-1', null, 'zh'), /CHECK/);
    assert.throws(() => insert.run('i18n-6', 'device-1', '  ', 'zh'), /CHECK/);
    sqlite.prepare("DELETE FROM w_devices WHERE id = 'device-1'").run();
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_device_i18n').get().count, 0);
  } finally { sqlite.close(); }
});

test('public collections resolve each field independently and retain stable slugs and publication filters', async () => {
  const { service, sqlite, load } = fixture();
  try {
    await service.saveAdminDeviceI18n({ device_id: 'device-1', language: 'en', display_name: 'English One', seo_title: 'English Wallpapers', description: 'English description' });
    await service.saveAdminDeviceI18n({ device_id: 'device-1', language: 'zh', display_name: '设备一', seo_title: '设备一壁纸' });
    sqlite.exec("UPDATE w_devices SET status = 'published'");
    sqlite.exec(`INSERT INTO w_wallpapers (id,device_id,name,mime_type,origin_key,file_format,media_type,category,status,create_date,updated_date)
      VALUES ('wall-1','device-1','Image','image/png','test/origin/a.png','png','static','phone','published',1,1)`);
    const db = load(`${root}src/lib/wallpaper-db.ts`);
    const zh = await db.loadDbCollection('test', 'device-one', 'zh');
    assert.equal(zh.name, '设备一');
    assert.equal(zh.seoTitle, '设备一壁纸');
    assert.equal(zh.description, 'English description');
    const ja = await db.loadDbCollection('test', 'device-one', 'ja');
    assert.equal(ja.name, 'English One');
    assert.equal(ja.seoTitle, null);
    assert.equal(ja.slug, 'device-one');
    assert.equal((await db.loadDbCollections('test', 'zh'))[0].name, '设备一');
    assert.equal((await db.loadDbIndex(['test'], 'zh')).test[0].name, '设备一');
    await service.deleteAdminDeviceI18n({ device_id: 'device-1', language: 'en' });
    assert.equal((await db.loadDbCollection('test', 'device-one', 'ja')).name, 'Device One');
    sqlite.exec("UPDATE w_wallpapers SET status = 'draft'");
    assert.equal(await db.loadDbCollection('test', 'device-one', 'zh'), null);
    assert.equal((await db.loadDbCollections('test', 'zh')).length, 0);
    sqlite.exec("UPDATE w_wallpapers SET status = 'published'; UPDATE w_devices SET status = 'draft'");
    assert.equal(await db.loadDbCollection('test', 'device-one', 'zh'), null);
    assert.equal((await db.loadDbIndex(['test'], 'zh')).test.length, 0);
  } finally { sqlite.close(); }
});

test('custom SEO copy appears in metadata, summaries and galleries without replacing the device name', () => {
  const { sqlite, load } = fixture();
  try {
    const collection = { name: '设备一', slug: 'device-one', date: '', item: [], seoTitle: '设备一原装壁纸', description: '自定义描述' };
    const mobile = load(`${root}src/lib/wallpaper-seo.ts`).buildWallpaperCollectionSeoCopy('zh', collection, '测试');
    assert.equal(mobile.title, '设备一原装壁纸 | PhWalls');
    assert.equal(mobile.description, '自定义描述');
    assert.equal(mobile.summaryDescription, '自定义描述');
    assert.equal(mobile.galleryName, '设备一原装壁纸');
    const desktop = load(`${root}src/lib/desktop-seo.ts`).buildDesktopDetailSeoCopy('zh', {
      collectionName: collection.name, categoryLabel: '测试', count: 0, seoTitle: collection.seoTitle, description: collection.description,
    });
    assert.equal(desktop.title, '设备一原装壁纸 | PhWalls');
    assert.equal(desktop.galleryDescription, '自定义描述');
    const generated = load(`${root}src/lib/wallpaper-seo.ts`).buildWallpaperCollectionSeoCopy('ja', { ...collection, seoTitle: null, description: null }, 'テスト');
    assert.ok(generated.title.includes('设备一'));
    assert.ok(!generated.title.includes('English Wallpapers'));
  } finally { sqlite.close(); }
});

test('translation API protects reads with login and writes with origin checks', async () => {
  const { sqlite, load } = fixture();
  try {
    const route = load(`${root}src/app/api/admin/device-i18n/route.ts`);
    const { createAdminSession } = load(`${root}src/lib/admin-auth.ts`);
    const { NextRequest } = require('next/server');
    const url = 'https://a.phwalls.com/api/admin/device-i18n?device_id=device-1';
    assert.equal((await route.GET(new NextRequest(url))).status, 401);
    assert.equal((await route.GET(new NextRequest(url.replace('a.phwalls.com', 'phwalls.com')))).status, 404);
    const cookie = `phwalls_admin_session=${await createAdminSession()}`;
    const body = JSON.stringify({ device_id: 'device-1', language: 'en', display_name: 'Device One' });
    for (const method of ['POST', 'DELETE']) {
      assert.equal((await route[method](new NextRequest(url, { method, headers: { cookie }, body }))).status, 403);
    }
    const headers = { cookie, origin: 'https://a.phwalls.com', 'x-phwalls-admin': '1', 'Content-Type': 'application/json' };
    const saved = await route.POST(new NextRequest(url, { method: 'POST', headers, body }));
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).data.display_name, 'Device One');
    const read = await route.GET(new NextRequest(url, { headers: { cookie } }));
    assert.equal(read.status, 200);
    assert.equal(read.headers.get('cache-control'), 'no-store');
    assert.equal((await read.json()).data.length, 1);
    assert.equal((await route.DELETE(new NextRequest(url, { method: 'DELETE', headers, body }))).status, 200);
  } finally { sqlite.close(); }
});

test('migrates existing SEO copy verbatim and preserves identifiers and timestamps without inventing a device translation', () => {
  const { sqlite } = fixture(true);
  try {
    const row = sqlite.prepare("SELECT * FROM w_device_i18n WHERE id = 'legacy-desc'").get();
    assert.equal(row.seo_title, 'Existing authored SEO title');
    assert.equal(row.description, 'Existing description');
    assert.equal(row.display_name, null);
    assert.equal(row.device_id, 'device-1');
    assert.equal(row.language, 'en');
    assert.equal(row.create_date, 10);
    assert.equal(row.updated_date, 20);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'w_device_desc'").get().count, 0);
  } finally { sqlite.close(); }
});

test('detail HTML uses the exact authored title and description with the device name in breadcrumbs', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  let texts;
  const { sqlite, load } = fixture(false, {
    'next/navigation': { usePathname: () => '/zh/wallpapers/xiaomi/device-one' },
    '@/components/LanguageProvider': { useLanguage: () => ({ language: 'zh', setLanguage() {}, texts }) },
    '@/components/Header': () => null,
    '@/components/Footer': () => null,
    '@/components/ShareRegistration': () => null,
    '@/components/WallpaperPreviewDownload': () => null,
  });
  try {
    texts = load(`${root}src/lib/i18n.ts`).getI18nTexts('zh');
    const Grid = load(`${root}src/components/DeviceWallpaperGrid.tsx`).default;
    const html = renderToStaticMarkup(React.createElement(Grid, {
      category: 'xiaomi', deviceData: { name: '设备一', seoTitle: '设备一背景免费下载', description: '独立编写的合集说明', date: '', item: [] },
    }));
    assert.match(html, /<h1[^>]*>设备一背景免费下载<\/h1>/);
    assert.match(html, /<p[^>]*>独立编写的合集说明<\/p>/);
    const breadcrumb = html.match(/<nav[^>]*>.*?<\/nav>/s)[0];
    assert.match(breadcrumb, /设备一<\/span>/);
    assert.ok(!breadcrumb.includes('设备一背景免费下载'));
  } finally { sqlite.close(); }
});

test('server data loader returns the requested language while looking up devices by stable slug', async () => {
  const { service, sqlite, load } = fixture();
  try {
    sqlite.exec("UPDATE w_devices SET brand_name = 'xiaomi', status = 'published'");
    sqlite.exec(`INSERT INTO w_wallpapers (id,device_id,name,mime_type,origin_key,file_format,media_type,category,status,create_date,updated_date)
      VALUES ('wall-1','device-1','Image','image/png','test/origin/a.png','png','static','phone','published',1,1)`);
    await service.saveAdminDeviceI18n({ device_id: 'device-1', language: 'zh', display_name: '设备一' });
    const data = load(`${root}src/lib/wallpaper-data-server.ts`);
    const zh = await data.loadWallpaperCollection('xiaomi', 'device-one', 'zh');
    assert.equal(zh.name, '设备一');
    assert.equal(zh.slug, 'device-one');
    const en = await data.loadWallpaperCollection('xiaomi', 'device-one', 'en');
    assert.equal(en.name, 'Device One');
  } finally { sqlite.close(); }
});

test('D1 names remain authoritative in generated SEO and retain punctuation in card titles', () => {
  const { sqlite, load } = fixture();
  try {
    const collection = { deviceId: 'device-1', name: 'Smartisan Nut R2', slug: 'device-one', date: '', item: [] };
    const seo = load(`${root}src/lib/wallpaper-seo.ts`).buildWallpaperCollectionSeoCopy('zh', collection, '测试');
    assert.equal(seo.seoName, 'Smartisan Nut R2');
    const { buildWallpaperListTitle } = load(`${root}src/lib/data.ts`);
    assert.equal(buildWallpaperListTitle('Wi-Fi Phone', '壁纸', true), 'Wi-Fi Phone 壁纸');
    const desktop = load(`${root}src/lib/desktop-seo.ts`).buildDesktopDetailSeoCopy('zh', {
      collectionName: 'Wi-Fi Desktop', displayName: 'Wi-Fi Desktop', categoryLabel: '测试', count: 1,
    });
    assert.ok(desktop.title.includes('Wi-Fi Desktop'));
  } finally { sqlite.close(); }
});

test('admin translation directory lists all devices with exact brand and language filters, search and pagination', async () => {
  const { service, sqlite } = fixture();
  try {
    const insert = sqlite.prepare(`INSERT INTO w_devices (id,brand_name,device_name,device_slug,device_category,create_date,updated_date)
      VALUES (?, ?, ?, ?, 'phone', 1, 1)`);
    for (let index = 0; index < 12; index++) {
      insert.run(`directory-${index}`, index < 6 ? 'test' : 'other', `Model ${index}`, `model-${index}`);
      for (const language of ['en', 'zh', 'ja', 'vi', 'zh-hant']) {
        await service.saveAdminDeviceI18n({ device_id: `directory-${index}`, language,
          display_name: language === 'zh' ? `中文设备${index}` : `${language} Model ${index}`,
          seo_title: `Title ${index}`, description: index === 7 && language === 'ja' ? 'unique background phrase' : 'Background' });
      }
    }
    const first = await service.listAdminDeviceI18nDirectory(new URLSearchParams());
    assert.equal(first.total, 60);
    assert.equal(first.page, 0);
    assert.equal(first.rows.length, 50);
    const second = await service.listAdminDeviceI18nDirectory(new URLSearchParams('page=1'));
    assert.equal(second.rows.length, 10);
    assert.ok(second.rows.every((row) => !first.rows.some((other) => other.id === row.id)));
    assert.equal((await service.listAdminDeviceI18nDirectory(new URLSearchParams('page=999'))).page, 1);
    const selected = await service.listAdminDeviceI18nDirectory(new URLSearchParams('brand=other&language=zh'));
    assert.equal(selected.total, 6);
    assert.ok(selected.rows.every((row) => row.brand_name === 'other' && row.language === 'zh'));
    assert.equal(selected.rows[0].device_name.startsWith('Model '), true);
    const name = await service.listAdminDeviceI18nDirectory(new URLSearchParams('search=中文设备7'));
    assert.equal(name.total, 1);
    assert.equal(name.rows[0].device_id, 'directory-7');
    const description = await service.listAdminDeviceI18nDirectory(new URLSearchParams('search=unique background phrase'));
    assert.equal(description.total, 1);
    assert.equal(description.rows[0].language, 'ja');
    assert.equal((await service.listAdminDeviceI18nDirectory(new URLSearchParams('brand=test-extra'))).total, 0);
    await assert.rejects(() => service.listAdminDeviceI18nDirectory(new URLSearchParams('language=fr')));
    await assert.rejects(() => service.listAdminDeviceI18nDirectory(new URLSearchParams({ search: 'x'.repeat(201) })));
  } finally { sqlite.close(); }
});

test('admin directory searches literal wildcard characters and reflects saved edits', async () => {
  const { service, sqlite, load } = fixture();
  try {
    await service.saveAdminDeviceI18n({ device_id: 'device-1', language: 'en', seo_title: '100%_original' });
    await service.saveAdminDeviceI18n({ device_id: 'device-2', language: 'en', seo_title: '100XXoriginal' });
    const found = await service.listAdminDeviceI18nDirectory(new URLSearchParams({ search: '100%_' }));
    assert.equal(found.total, 1);
    assert.equal(found.rows[0].device_id, 'device-1');
    await service.saveAdminDeviceI18n({ device_id: 'device-1', language: 'en', seo_title: 'Updated title' });
    assert.equal((await service.listAdminDeviceI18nDirectory(new URLSearchParams('search=Updated'))).rows[0].seo_title, 'Updated title');
    const route = load(`${root}src/app/api/admin/device-i18n/route.ts`);
    const { createAdminSession } = load(`${root}src/lib/admin-auth.ts`);
    const { NextRequest } = require('next/server');
    const url = 'https://a.phwalls.com/api/admin/device-i18n?language=en';
    assert.equal((await route.GET(new NextRequest(url))).status, 401);
    const headers = { cookie: `phwalls_admin_session=${await createAdminSession()}` };
    const response = await route.GET(new NextRequest(url, { headers }));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.data.length, 2);
    assert.equal(body.meta.total, 2);
    assert.equal(body.meta.pageSize, 50);
  } finally { sqlite.close(); }
});

test('missing descriptions include absent translations and partial content only for devices with available wallpapers', async () => {
  const { service, sqlite } = fixture();
  try {
    sqlite.exec(`INSERT INTO w_wallpapers (id,device_id,name,mime_type,origin_key,file_format,media_type,category,status,create_date,updated_date)
      VALUES ('wall-1','device-1','Image','image/png','test/origin/a.png','png','static','phone','published',1,1),
      ('wall-2','device-1','Image 2','image/png','test/origin/b.png','png','static','phone','draft',1,1)`);
    await service.saveAdminDeviceI18n({ device_id: 'device-1', language: 'en', description: 'English fallback' });
    await service.saveAdminDeviceI18n({ device_id: 'device-1', language: 'zh', display_name: '设备一', seo_title: '设备一壁纸' });
    const missing = await service.listAdminDeviceI18nDirectory(new URLSearchParams('view=missing'));
    assert.equal(missing.total, 4);
    assert.deepEqual(Array.from(missing.rows, (row) => row.language).sort(), ['ja', 'vi', 'zh', 'zh-hant']);
    assert.ok(missing.rows.every((row) => row.device_id === 'device-1' && row.wallpaper_count === 2));
    assert.equal(missing.rows.find((row) => row.language === 'zh').display_name, '设备一');
    assert.ok(missing.rows.every((row) => typeof row.id === 'string' && row.id.length));
    assert.deepEqual(JSON.parse(JSON.stringify(missing.missingBrands)), [{ brand_name: 'test', device_count: 1, missing_count: 4 }]);
    const zh = await service.listAdminDeviceI18nDirectory(new URLSearchParams('view=missing&language=zh&search=设备一'));
    assert.equal(zh.total, 1);
    assert.equal(zh.missingBrands[0].missing_count, 1);
    assert.equal((await service.listAdminDeviceI18nDirectory(new URLSearchParams('view=missing&brand=other'))).total, 0);
    await service.saveAdminDeviceI18n({ device_id: 'device-1', language: 'zh', description: '中文描述' });
    assert.equal((await service.listAdminDeviceI18nDirectory(new URLSearchParams('view=missing&language=zh'))).total, 0);
    sqlite.exec("UPDATE w_wallpapers SET deletion_state = 'pending'");
    assert.equal((await service.listAdminDeviceI18nDirectory(new URLSearchParams('view=missing'))).total, 0);
    await assert.rejects(() => service.listAdminDeviceI18nDirectory(new URLSearchParams('view=missing&language=fr')));
  } finally { sqlite.close(); }
});

test('missing description brand totals cover all pages without counting each wallpaper as a device', async () => {
  const { service, sqlite } = fixture();
  try {
    const device = sqlite.prepare(`INSERT INTO w_devices (id,brand_name,device_name,device_slug,device_category,create_date,updated_date)
      VALUES (?, ?, ?, ?, 'phone', 1, 1)`);
    const wallpaper = sqlite.prepare(`INSERT INTO w_wallpapers (id,device_id,name,mime_type,origin_key,file_format,media_type,category,create_date,updated_date)
      VALUES (?,?,'Image','image/png','test/origin/a.png','png','static','phone',1,1)`);
    for (let index = 0; index < 12; index++) {
      device.run(`missing-${index}`, index < 6 ? 'test' : 'other', `Model ${index}`, `model-${index}`);
      wallpaper.run(`wall-${index}`, `missing-${index}`);
    }
    const first = await service.listAdminDeviceI18nDirectory(new URLSearchParams('view=missing'));
    const second = await service.listAdminDeviceI18nDirectory(new URLSearchParams('view=missing&page=1'));
    assert.equal(first.total, 60);
    assert.equal(first.rows.length, 50);
    assert.equal(second.rows.length, 10);
    assert.ok(second.rows.every((row) => !first.rows.some((other) => other.id === row.id)));
    assert.deepEqual(JSON.parse(JSON.stringify(first.missingBrands)), [
      { brand_name: 'other', device_count: 6, missing_count: 30 },
      { brand_name: 'test', device_count: 6, missing_count: 30 },
    ]);
    assert.equal((await service.listAdminDeviceI18nDirectory(new URLSearchParams('view=missing&page=999'))).page, 1);
  } finally { sqlite.close(); }
});

test('translation table exposes persisted names, titles, descriptions and a language-specific edit action', () => {
  const { sqlite, load } = fixture();
  try {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { AdminDeviceI18nTable } = load(`${root}src/app/manager/AdminDeviceI18nPanel.tsx`);
    const html = renderToStaticMarkup(React.createElement(AdminDeviceI18nTable, {
      rows: [{ id: 'translation-1', device_id: 'device-1', device_name: 'Device One', brand_name: 'test',
        language: 'zh', display_name: '设备一', seo_title: '设备一原装壁纸', description: '保存的壁纸合集说明', create_date: 1, updated_date: 2 }],
      brands: [{ slug: 'test', title: '测试品牌' }], onEdit() {},
    }));
    assert.ok(html.includes('测试品牌'));
    assert.ok(html.includes('设备一原装壁纸'));
    assert.ok(html.includes('保存的壁纸合集说明'));
    assert.match(html, /<button[^>]*aria-label="编辑 Device One 的简体中文内容"/);
    const empty = renderToStaticMarkup(React.createElement(AdminDeviceI18nTable, {
      rows: [], brands: [], onEdit() {},
    }));
    assert.ok(empty.includes('没有符合条件的多语言记录'));
  } finally { sqlite.close(); }
});

test('missing description table offers editing for an unsaved language without a fake update date', () => {
  const { sqlite, load } = fixture();
  try {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { AdminDeviceI18nTable } = load(`${root}src/app/manager/AdminDeviceI18nPanel.tsx`);
    const html = renderToStaticMarkup(React.createElement(AdminDeviceI18nTable, {
      rows: [{ id: 'device-1:ja', device_id: 'device-1', device_name: 'Device One', brand_name: 'test',
        language: 'ja', display_name: null, seo_title: null, description: null, create_date: 0, updated_date: 0, wallpaper_count: 2 }],
      brands: [{ slug: 'test', title: '测试品牌' }], missing: true, onEdit() {},
    }));
    assert.ok(html.includes('2 张壁纸'));
    assert.ok(html.includes('尚未保存'));
    assert.ok(!html.includes('1970'));
    assert.match(html, /aria-label="补充 Device One 的日语描述"/);
  } finally { sqlite.close(); }
});

test('admin table displays the brand in the record language instead of the English directory label', () => {
  const { sqlite, load } = fixture();
  try {
    const React = require('react');
    const { renderToStaticMarkup } = require('react-dom/server');
    const { AdminDeviceI18nTable } = load(`${root}src/app/manager/AdminDeviceI18nPanel.tsx`);
    const html = renderToStaticMarkup(React.createElement(AdminDeviceI18nTable, {
      rows: [{ id: 'translation-1', device_id: 'device-1', device_name: 'Samsung Galaxy A01', brand_name: 'samsung',
        language: 'zh', display_name: '三星 Galaxy A01', seo_title: '三星 Galaxy A01 壁纸', description: '三星 Galaxy A01壁纸合集', create_date: 1, updated_date: 2 }],
      brands: [{ slug: 'samsung', title: 'Samsung' }], onEdit() {},
    }));
    assert.match(html, /<div[^>]*>三星<\/div>/);
    assert.ok(html.includes('三星 Galaxy A01 壁纸'));
  } finally { sqlite.close(); }
});
