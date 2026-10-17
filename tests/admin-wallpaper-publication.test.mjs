import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = fileURLToPath(new URL('../', import.meta.url));

function fixture(missingFiles = new Set(), onHead = () => {}, onDelete = () => {}, beforeBatch = () => {}, options = {}) {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON');
  for (const migration of readdirSync(`${root}migrations`).filter((name) => name.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(`${root}migrations/${migration}`, 'utf8'));
  }
  sqlite.exec("INSERT INTO w_brands (slug,title,title_key,kind,create_date,updated_date) VALUES ('test','Test','test','mobile',1,1)");
  sqlite.exec(`INSERT INTO w_devices (id, brand_name, device_name, name_key, device_slug, device_category,
    release_date, create_date, updated_date)
    VALUES ('device-1', 'test', 'Device One', 'device one', 'device-one', 'phone', '2026/10/04', 1, 1)`);
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
    async batch(statements) {
      beforeBatch(sqlite);
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
  };
  const cache = new Map();
  const storedObjects = new Map();
  const removedObjects = [];
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const source = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    runInNewContext(source, {
      module, exports: module.exports, crypto: globalThis.crypto, Date: options.fixedNow === undefined ? Date : class extends Date { static now() { return options.fixedNow; } }, Error, URL, TextEncoder,
      require(specifier) {
        if (specifier === '@/lib/wallpaper-db') return { getWallpaperDb: () => db };
        if (specifier === '@/lib/r2-upload') return {
          createR2UploadUrl: async (key) => `https://uploads.example/${encodeURIComponent(key)}`,
          createUploadGrant: async (key) => key,
          verifyUploadGrant: async (token) => JSON.parse(token),
          headR2Object: async (key) => {
            onHead(key, sqlite);
            if (storedObjects.has(key)) return missingFiles.has(key) ? null : storedObjects.get(key);
            const existing = sqlite.prepare('SELECT 1 FROM w_wallpapers WHERE origin_key = ? OR compress_key = ?').get(key, key);
            return missingFiles.has(key) || !existing ? null : { size: 100, mimeType: 'image/webp' };
          },
          deleteR2Object: async (key) => { await onDelete(key, sqlite); removedObjects.push(key); storedObjects.delete(key); },
        };
        if (specifier === '@/lib/admin-origin-metadata') return { readR2OriginMetadata: async (key, info) => {
          if (options.metadataFailure) throw new Error('无法读取原文件分辨率');
          return { ...info, width: options.originWidth || 1440, height: options.originHeight || 3200 };
        } };
        if (specifier === '@/lib/admin-auth') return { requireAdmin: async () => null };
        if (specifier === '@/types') return load(`${root}src/types/index.ts`);
        if (specifier.endsWith('.json') && specifier.startsWith('@/')) return JSON.parse(readFileSync(`${root}src/${specifier.slice(2)}`, 'utf8'));
        if (specifier.startsWith('@/')) return load(`${root}src/${specifier.slice(2)}.ts`);
        return require(specifier);
      },
    }, { filename: path });
    return module.exports;
  }
  const service = load(`${root}src/lib/admin-data.ts`);
  const upload = (name, patch = {}) => service.createAdminWallpaper({
    device_id: 'device-1', name, origin_key: `test/device/origin/${name}.webp`,
    compress_key: `test/device/compress/${name}.webp`, mime_type: 'image/webp', size_bytes: 100, ...patch,
  });
  return { sqlite, service, upload, load, storedObjects, removedObjects };
}

test('device themes round trip as one optional style without changing wallpaper light/dark themes', async () => {
  const { sqlite, service, upload } = fixture();
  try {
    await upload('paired-dark', { theme: 'dark' });
    const created = await service.createAdminDevice({ brand_name: 'test', device_name: 'Device Two',
      device_category: 'phone', release_date: '2026/10/17', theme: ' gradient ' });
    assert.equal(created.theme, 'gradient');
    assert.equal((await service.updateAdminDevice({ id: created.id, theme: 'dark' })).theme, 'dark');
    assert.equal((await service.updateAdminDevice({ id: created.id, device_name: 'Device Two Updated' })).theme, 'dark');
    assert.equal((await service.updateAdminDevice({ id: created.id, theme: '' })).theme, null);
    assert.equal((await service.updateAdminDevice({ id: created.id, theme: null })).theme, null);
    assert.equal(sqlite.prepare("SELECT theme FROM w_wallpapers WHERE name='paired-dark'").get().theme, 'dark');
    assert.equal(sqlite.prepare("SELECT theme FROM w_devices WHERE id='device-1'").get().theme, null);
  } finally { sqlite.close(); }
});

test('device theme edits reject arrays, non-strings and oversized values without overwriting the device', async () => {
  const { sqlite, service } = fixture();
  try {
    for (const theme of [['gradient', 'anime'], 123, {}, 'x'.repeat(41), 'gradient\nanime', '渐变', 'unknown-theme']) {
      await assert.rejects(service.updateAdminDevice({ id: 'device-1', theme }));
    }
    assert.equal(sqlite.prepare("SELECT device_name FROM w_devices WHERE id='device-1'").get().device_name, 'Device One');
    const created = await service.createAdminDevice({ brand_name: 'test', device_name: 'Device Three',
      device_category: 'phone', release_date: '2026/10/17' });
    assert.equal(created.theme, null);
  } finally { sqlite.close(); }
});

test('the database enforces the same device theme enum as the five-language labels', () => {
  const { sqlite, load } = fixture();
  try {
    const { DEVICE_THEMES, DEVICE_THEME_LABEL_KEYS } = load(`${root}src/lib/device-theme.ts`);
    const { getI18nTexts } = load(`${root}src/lib/i18n.ts`);
    for (const theme of DEVICE_THEMES) {
      sqlite.prepare("UPDATE w_devices SET theme=? WHERE id='device-1'").run(theme);
      for (const language of ['en', 'zh', 'ja', 'vi', 'zh-hant']) {
        assert.ok(getI18nTexts(language)[DEVICE_THEME_LABEL_KEYS[theme]]);
      }
    }
    for (const invalid of ['渐变', 'unknown-theme', '["gradient","anime"]', '']) {
      assert.throws(() => sqlite.prepare("UPDATE w_devices SET theme=? WHERE id='device-1'").run(invalid));
      assert.throws(() => sqlite.prepare(`INSERT INTO w_devices
        (id,brand_name,device_name,device_slug,device_category,theme,create_date,updated_date)
        VALUES('invalid','test','Invalid','invalid','phone',?,1,1)`).run(invalid));
    }
  } finally { sqlite.close(); }
});

test('the optional browser preview uses a video grant bound to the original filename and device', async () => {
  const { sqlite, load, storedObjects } = fixture();
  try {
    const prefix = 'live/Test/Device One';
    const route = load(`${root}src/app/api/admin/upload/route.ts`);
    const request = (input) => route.POST(new Request('https://example.com/api/admin/upload', { method: 'POST', body: JSON.stringify(input) }));
    const authorize = await request({ action: 'authorize', device_id: 'device-1', role: 'preview', media_type: 'dynamic',
      mime_type: 'video/mp4', file_name: 'video.mp4', size_bytes: 50 });
    assert.equal(authorize.status, 200);
    assert.equal((await authorize.json()).key, `${prefix}/preview/video.mp4`);
    const grant = (role, file, mimeType, size = 100) => ({ key: `${prefix}/${role}/${file}`, mimeType, size,
      deviceId: 'device-1', role, prefix });
    const origin = grant('origin', 'video.mp4', 'video/mp4');
    const cover = grant('compress', 'video.webp', 'image/webp');
    const video = grant('preview', 'video.mp4', 'video/mp4', 50);
    for (const item of [origin, cover, video]) storedObjects.set(item.key, { size: item.size, mimeType: item.mimeType });
    const input = { action: 'complete', device_id: 'device-1', name: 'video', media_type: 'dynamic',
      origin_token: JSON.stringify(origin), preview_token: JSON.stringify(cover) };
    for (const invalid of [{ ...video, key: `${prefix}/preview/other.mp4` }, { ...video, deviceId: 'other-device' },
      { ...video, role: 'origin' }, { ...video, mimeType: 'image/webp' }, { ...video, size: 51 }]) {
      assert.equal((await request({ ...input, video_preview_token: JSON.stringify(invalid) })).status, 400);
      assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_wallpapers').get().count, 0);
    }
    const completed = await request({ ...input, video_preview_token: JSON.stringify(video) });
    assert.equal(completed.status, 201);
    const saved = (await completed.json()).data;
    assert.equal(saved.width, 1440);
    assert.equal(saved.height, 3200);
    assert.equal(saved.size_bytes, origin.size);
    const row = saved;
    assert.equal(row.origin_key, origin.key);
    assert.equal(row.compress_key, cover.key);
    assert.equal(row.size_bytes, 100);
  } finally { sqlite.close(); }
});

test('completed static uploads save server-read original dimensions and ignore client metadata', async () => {
  const { sqlite, load, storedObjects } = fixture(new Set(), () => {}, () => {}, () => {}, { originWidth: 17, originHeight: 31 });
  try {
    const prefix = 'test/Device One';
    const origin = { key: `${prefix}/origin/original.png`, prefix, deviceId: 'device-1', role: 'origin', size: 100, mimeType: 'image/png' };
    const cover = { key: `${prefix}/compress/cover.webp`, prefix, deviceId: 'device-1', role: 'compress', size: 20, mimeType: 'image/webp' };
    for (const grant of [origin, cover]) storedObjects.set(grant.key, { size: grant.size, mimeType: grant.mimeType });
    const route = load(`${root}src/app/api/admin/upload/route.ts`);
    const response = await route.POST(new Request('https://example.com/api/admin/upload', { method: 'POST', body: JSON.stringify({
      action: 'complete', device_id: 'device-1', name: 'original', origin_token: JSON.stringify(origin), preview_token: JSON.stringify(cover),
      width: 999, height: 999, size_bytes: 999,
    }) }));
    assert.equal(response.status, 201);
    const saved = (await response.json()).data;
    assert.equal(saved.width, 17); assert.equal(saved.height, 31); assert.equal(saved.size_bytes, 100);
    assert.equal(saved.status, 'draft');
  } finally { sqlite.close(); }
});

test('unreadable original metadata blocks upload registration without leaving a dimensionless row', async () => {
  const { sqlite, load, storedObjects } = fixture(new Set(), () => {}, () => {}, () => {}, { metadataFailure: true });
  try {
    const prefix = 'test/Device One';
    const origin = { key: `${prefix}/origin/broken.png`, prefix, size: 100, mimeType: 'image/png' };
    const cover = { key: `${prefix}/compress/cover.webp`, prefix, size: 20, mimeType: 'image/webp' };
    for (const grant of [origin, cover]) storedObjects.set(grant.key, { size: grant.size, mimeType: grant.mimeType });
    const response = await load(`${root}src/app/api/admin/upload/route.ts`).POST(new Request('https://example.com/api/admin/upload', {
      method: 'POST', body: JSON.stringify({ action: 'complete', device_id: 'device-1', name: 'broken',
        origin_token: JSON.stringify(origin), preview_token: JSON.stringify(cover) }),
    }));
    assert.equal(response.status, 400);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_wallpapers').get().count, 0);
  } finally { sqlite.close(); }
});

test('video deletion also cleans the derived browser preview and its deletion marker', async () => {
  const { sqlite, service, upload, removedObjects } = fixture();
  try {
    const row = await upload('video', { media_type: 'dynamic', mime_type: 'video/mp4', origin_key: 'live/Test/Device One/origin/video.mp4', compress_key: 'live/Test/Device One/compress/video.webp' });
    await service.deleteAdminWallpaper({ id: row.id });
    assert.ok(removedObjects.includes('live/Test/Device One/preview/video.mp4'));
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_deleted_wallpaper_files').get().count, 3);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_wallpapers').get().count, 0);
  } finally { sqlite.close(); }
});

test('upload authorization reuses the selected media directory and rejects the other media directory', async () => {
  const { sqlite, upload, load } = fixture();
  try {
    await upload('still', { origin_key: 'test/Device One/origin/still.webp', compress_key: 'test/Device One/compress/still.webp' });
    await upload('live', { media_type: 'dynamic', mime_type: 'video/mp4',
      origin_key: 'live/Test/Device One/origin/live.mp4', compress_key: 'live/Test/Device One/compress/live.webp' });
    const route = load(`${root}src/app/api/admin/upload/route.ts`);
    const authorize = (patch = {}) => {
      const input = { action: 'authorize', device_id: 'device-1', role: 'origin',
        media_type: 'dynamic', mime_type: 'video/mp4', size_bytes: 100, ...patch };
      input.file_name ||= input.mime_type === 'video/mp4' ? 'new.mp4' : 'new.webp';
      return route.POST(new Request('https://example.com/api/admin/upload', { method: 'POST', body: JSON.stringify(input) }));
    };
    const response = await authorize();
    assert.equal(response.status, 200);
    assert.ok((await response.json()).key.startsWith('live/Test/Device One/origin/'));
    const cover = await authorize({ role: 'compress', mime_type: 'image/webp' });
    assert.equal(cover.status, 200);
    assert.ok((await cover.json()).key.startsWith('live/Test/Device One/compress/'));
    assert.equal((await authorize({ r2_prefix: 'test/Device One', path_mode: 'custom' })).status, 400);
    assert.equal((await authorize({ mime_type: 'image/webp' })).status, 400);
    assert.equal((await authorize({ r2_prefix: 'live/test/device-one', path_mode: 'device' })).status, 400);
    assert.equal((await authorize({ r2_prefix: 'test/New Device', path_mode: 'custom' })).status, 400);
    assert.equal((await authorize({ media_type: 'static', mime_type: 'image/webp', r2_prefix: 'live/Other/Device', path_mode: 'custom' })).status, 400);
    assert.equal((await authorize({ r2_prefix: 'live/Test/New Device', path_mode: 'custom' })).status, 200);
  } finally { sqlite.close(); }
});

test('upload directory API separates media, excludes deleting files, and exposes multiple choices', async () => {
  const { sqlite, upload, load } = fixture();
  try {
    await upload('first', { origin_key: 'test/Device One/origin/first.webp', compress_key: 'test/Device One/compress/first.webp' });
    await upload('second', { origin_key: 'test/Second Directory/origin/second.webp', compress_key: 'test/Second Directory/compress/second.webp' });
    await upload('deleting', { origin_key: 'test/Deleted Directory/origin/deleting.webp', compress_key: 'test/Deleted Directory/compress/deleting.webp' });
    sqlite.exec("UPDATE w_wallpapers SET deletion_state = 'pending' WHERE name = 'deleting'");
    const route = load(`${root}src/app/api/admin/upload/route.ts`);
    const { NextRequest } = require('next/server');
    const lookup = (media) => route.GET(new NextRequest(`https://example.com/api/admin/upload?device_id=device-1&media_type=${media}`));
    const response = await lookup('static');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual((await response.json()).data, { prefix: '',
      directories: ['test/Device One', 'test/Second Directory'], source: 'multiple' });
    assert.deepEqual((await (await lookup('dynamic')).json()).data,
      { prefix: 'live/Test/Device One', directories: [], source: 'default' });
    const firstLive = await route.POST(new Request('https://example.com/api/admin/upload', {
      method: 'POST', body: JSON.stringify({ action: 'authorize', device_id: 'device-1', role: 'origin',
        media_type: 'dynamic', mime_type: 'video/mp4', size_bytes: 100, path_mode: 'device',
        r2_prefix: 'live/Test/Device One', file_name: 'first.mp4' }),
    }));
    assert.equal(firstLive.status, 200);
    assert.ok((await firstLive.json()).key.startsWith('live/Test/Device One/origin/'));
    const authorize = (prefix) => route.POST(new Request('https://example.com/api/admin/upload', {
      method: 'POST', body: JSON.stringify({ action: 'authorize', device_id: 'device-1', role: 'origin',
        media_type: 'static', mime_type: 'image/webp', size_bytes: 100, path_mode: 'device', file_name: 'new.webp',
        ...(prefix ? { r2_prefix: prefix } : {}) }),
    }));
    assert.equal((await authorize()).status, 400);
    const selected = await authorize('test/Second Directory');
    assert.equal(selected.status, 200);
    assert.ok((await selected.json()).key.startsWith('test/Second Directory/origin/'));
    assert.equal((await lookup('invalid')).status, 400);
  } finally { sqlite.close(); }
});

test('Huawei first Live upload uses the historical brand spelling and keeps the original filename', async () => {
  const { sqlite, load } = fixture();
  try {
    sqlite.exec("UPDATE w_devices SET brand_name='huawei',device_name='Huawei Mate XT 2' WHERE id='device-1'");
    const route = load(`${root}src/app/api/admin/upload/route.ts`);
    const { NextRequest } = require('next/server');
    const storage = await route.GET(new NextRequest('https://example.com/api/admin/upload?device_id=device-1&media_type=dynamic'));
    assert.equal((await storage.json()).data.prefix, 'live/Huawei/Huawei Mate XT 2');
    const input = { action: 'authorize', device_id: 'device-1', role: 'origin', media_type: 'dynamic',
      mime_type: 'video/mp4', size_bytes: 100, file_name: 'huawei-mate-xt-2-mountain-gold-shadow.mp4' };
    const authorize = (patch = {}) => route.POST(new Request('https://example.com/api/admin/upload', {
      method: 'POST', body: JSON.stringify({ ...input, ...patch }),
    }));
    const response = await authorize();
    assert.equal(response.status, 200);
    const grant = await response.json();
    assert.equal(grant.key, 'live/Huawei/Huawei Mate XT 2/origin/huawei-mate-xt-2-mountain-gold-shadow.mp4');
    assert.deepEqual(grant.headers, { 'If-None-Match': '*' });
    assert.equal((await authorize({ path_mode: 'custom', r2_prefix: 'live/huawei/Huawei Mate XT 2' })).status, 400);
    for (const file_name of ['../outside.mp4', 'nested/video.mp4', 'bad\\video.mp4', 'video.webp', 'video%2Ffile.mp4', 'video\u0000.mp4', '']) {
      assert.equal((await authorize({ file_name })).status, 400);
    }
  } finally { sqlite.close(); }
});

test('upload authorization refuses an existing original filename instead of overwriting it', async () => {
  const { sqlite, upload, load } = fixture();
  try {
    await upload('first', { origin_key: 'test/Device One/origin/first.webp', compress_key: 'test/Device One/compress/first.webp' });
    const route = load(`${root}src/app/api/admin/upload/route.ts`);
    const response = await route.POST(new Request('https://example.com/api/admin/upload', {
      method: 'POST', body: JSON.stringify({ action: 'authorize', device_id: 'device-1', role: 'origin', media_type: 'static',
        mime_type: 'image/webp', size_bytes: 100, file_name: 'first.webp' }),
    }));
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /已存在/);
  } finally { sqlite.close(); }
});

test('upload completion rejects a different selected media type before storing a wallpaper', async () => {
  const { sqlite, load } = fixture();
  try {
    const route = load(`${root}src/app/api/admin/upload/route.ts`);
    const response = await route.POST(new Request('https://example.com/api/admin/upload', {
      method: 'POST', body: JSON.stringify({ action: 'complete', device_id: 'device-1', name: 'mismatch', media_type: 'static',
        origin_token: JSON.stringify({ key: 'live/test/device-one/origin/a.mp4', mimeType: 'video/mp4', size: 100 }),
        preview_token: JSON.stringify({ key: 'live/test/device-one/compress/a.webp', mimeType: 'image/webp', size: 100 }) }),
    }));
    assert.equal(response.status, 400);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_wallpapers').get().count, 0);
  } finally { sqlite.close(); }
});

test('static and Live uploads with the same name have separate primary covers', async () => {
  const { sqlite, upload, service } = fixture();
  try {
    const still = await upload('same');
    const live = await upload('same', { media_type: 'dynamic', mime_type: 'video/mp4',
      origin_key: 'Live/test/device/origin/same.mp4', compress_key: 'Live/test/device/compress/same.webp' });
    assert.equal(still.is_primary, 1);
    assert.equal(live.is_primary, 1);
    const next = await upload('next', { media_type: 'dynamic', mime_type: 'video/mp4',
      origin_key: 'Live/test/device/origin/next.mp4', compress_key: 'Live/test/device/compress/next.webp' });
    await service.updateAdminWallpaper({ id: next.id, is_primary: 1 });
    assert.equal(sqlite.prepare('SELECT is_primary FROM w_wallpapers WHERE id = ?').get(still.id).is_primary, 1);
    assert.equal(sqlite.prepare('SELECT is_primary FROM w_wallpapers WHERE id = ?').get(live.id).is_primary, 0);
    assert.equal(sqlite.prepare('SELECT is_primary FROM w_wallpapers WHERE id = ?').get(next.id).is_primary, 1);
  } finally { sqlite.close(); }
});

test('first uploaded wallpaper becomes the primary draft and later uploads preserve it', async () => {
  const { sqlite, upload } = fixture();
  try {
    const first = await upload('first');
    const second = await upload('second');
    assert.equal(first.is_primary, 1);
    assert.equal(first.status, 'draft');
    assert.equal(second.is_primary, 0);
    assert.equal(sqlite.prepare('SELECT id FROM w_wallpapers WHERE is_primary = 1').get().id, first.id);
  } finally { sqlite.close(); }
});

test('first upload in another category gets its own primary without replacing the existing category', async () => {
  const { sqlite, upload } = fixture();
  try {
    await upload('phone');
    const tablet = await upload('tablet', { category: 'pad' });
    assert.equal(tablet.is_primary, 1);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_wallpapers WHERE is_primary = 1').get().count, 2);
  } finally { sqlite.close(); }
});

test('uploading more wallpapers does not undo an explicitly cleared primary', async () => {
  const { sqlite, upload } = fixture();
  try {
    await upload('first');
    sqlite.exec('UPDATE w_wallpapers SET is_primary = 0');
    const second = await upload('second');
    assert.equal(second.is_primary, 0);
  } finally { sqlite.close(); }
});

test('publishing a device with draft publication publishes its selected primary and all valid drafts', async () => {
  const { sqlite, service, upload } = fixture();
  try {
    const first = await upload('first');
    const second = await upload('second');
    sqlite.prepare('UPDATE w_wallpapers SET is_primary = 0 WHERE id = ?').run(first.id);
    sqlite.prepare('UPDATE w_wallpapers SET is_primary = 1 WHERE id = ?').run(second.id);
    const device = await service.updateAdminDevice({ id: 'device-1', status: 'published', publish_drafts: true });
    assert.equal(device.status, 'published');
    const rows = sqlite.prepare('SELECT status, is_primary FROM w_wallpapers ORDER BY name').all();
    assert.deepEqual(rows.map((row) => [row.status, row.is_primary]), [['published', 0], ['published', 1]]);
  } finally { sqlite.close(); }
});

test('a missing R2 file prevents publication of both device and draft wallpapers', async () => {
  const { sqlite, service, upload } = fixture(new Set(['test/device/compress/second.webp']));
  try {
    await upload('first');
    await upload('second');
    await assert.rejects(() => service.updateAdminDevice({ id: 'device-1', status: 'published', publish_drafts: true }), /R2/);
    assert.equal(sqlite.prepare('SELECT status FROM w_devices').get().status, 'draft');
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM w_wallpapers WHERE status = 'published'").get().count, 0);
  } finally { sqlite.close(); }
});

test('publication skips unpublished or deleting wallpapers and never replaces the chosen primary', async () => {
  const { sqlite, service, upload } = fixture(new Set(['test/device/origin/unpublished.webp', 'test/device/origin/deleting.webp']));
  try {
    const first = await upload('first');
    const unpublished = await upload('unpublished');
    const deleting = await upload('deleting');
    sqlite.prepare("UPDATE w_wallpapers SET status = 'unpublished' WHERE id = ?").run(unpublished.id);
    sqlite.prepare("UPDATE w_wallpapers SET deletion_state = 'pending' WHERE id = ?").run(deleting.id);
    await service.updateAdminDevice({ id: 'device-1', status: 'published', publish_drafts: true });
    assert.equal(sqlite.prepare('SELECT status, is_primary FROM w_wallpapers WHERE id = ?').get(first.id).is_primary, 1);
    assert.equal(sqlite.prepare('SELECT status FROM w_wallpapers WHERE id = ?').get(unpublished.id).status, 'unpublished');
    assert.equal(sqlite.prepare('SELECT status FROM w_wallpapers WHERE id = ?').get(deleting.id).status, 'draft');
  } finally { sqlite.close(); }
});

test('publishing without opting in still requires a separately published primary', async () => {
  const { sqlite, service, upload } = fixture();
  try {
    await upload('first');
    await assert.rejects(() => service.updateAdminDevice({ id: 'device-1', status: 'published' }));
    assert.equal(sqlite.prepare('SELECT status FROM w_wallpapers').get().status, 'draft');
  } finally { sqlite.close(); }
});

test('a missing preview or missing primary cannot be bypassed by publishing drafts', async () => {
  for (const patch of [{ compress_key: null }, { clearPrimary: true }]) {
    const { sqlite, service, upload } = fixture();
    try {
      await upload('first', patch);
      if (patch.clearPrimary) sqlite.exec('UPDATE w_wallpapers SET is_primary = 0');
      await assert.rejects(() => service.updateAdminDevice({ id: 'device-1', status: 'published', publish_drafts: true }));
      assert.equal(sqlite.prepare('SELECT status FROM w_devices').get().status, 'draft');
      assert.equal(sqlite.prepare('SELECT status FROM w_wallpapers').get().status, 'draft');
    } finally { sqlite.close(); }
  }
});

test('a concurrent file change prevents unchecked drafts from being published', async () => {
  const { sqlite, service, upload } = fixture(new Set(), (key, sqlite) => {
    if (key === 'test/device/compress/second.webp') {
      sqlite.exec("UPDATE w_wallpapers SET origin_key = 'test/device/origin/unchecked.webp', updated_date = updated_date + 1 WHERE name = 'second'");
    }
  });
  try {
    await upload('first');
    await upload('second');
    await assert.rejects(() => service.updateAdminDevice({ id: 'device-1', status: 'published', publish_drafts: true }), /刷新/);
    assert.equal(sqlite.prepare('SELECT status FROM w_devices').get().status, 'draft');
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM w_wallpapers WHERE status = 'published'").get().count, 0);
  } finally { sqlite.close(); }
});

test('a failed device update rolls back the associated wallpaper publication', async () => {
  const { sqlite, service, upload } = fixture();
  try {
    await upload('first');
    sqlite.exec(`CREATE TRIGGER fail_device_publish BEFORE UPDATE OF status ON w_devices
      WHEN NEW.status = 'published' BEGIN SELECT RAISE(ABORT, 'device_write_failed'); END`);
    await assert.rejects(() => service.updateAdminDevice({ id: 'device-1', status: 'published', publish_drafts: true }), /device_write_failed/);
    assert.equal(sqlite.prepare('SELECT status FROM w_devices').get().status, 'draft');
    assert.equal(sqlite.prepare('SELECT status FROM w_wallpapers').get().status, 'draft');
  } finally { sqlite.close(); }
});

test('concurrent device changes or clearing the primary leave the drafts unpublished', async () => {
  for (const mutation of [
    'UPDATE w_devices SET updated_date = updated_date + 1',
    'UPDATE w_wallpapers SET is_primary = 0',
  ]) {
    const { sqlite, service, upload } = fixture(new Set(), () => sqlite.exec(mutation));
    try {
      await upload('first');
      await assert.rejects(() => service.updateAdminDevice({ id: 'device-1', status: 'published', publish_drafts: true }));
      assert.equal(sqlite.prepare('SELECT status FROM w_devices').get().status, 'draft');
      assert.equal(sqlite.prepare('SELECT status FROM w_wallpapers').get().status, 'draft');
    } finally { sqlite.close(); }
  }
});

test('device checks distinguish selected draft primaries from published primaries', async () => {
  const { sqlite, upload, load } = fixture();
  try {
    await upload('first');
    await upload('second');
    const route = load(`${root}src/app/api/admin/device-check/route.ts`);
    const { data } = await (await route.GET({ nextUrl: new URL('https://example.test/api/admin/device-check?id=device-1') })).json();
    assert.equal(data.total, 2);
    assert.equal(data.primary_count, 1);
    assert.equal(data.published_primary, 0);
    assert.equal(data.published, 0);
  } finally { sqlite.close(); }
});

test('device creation and editing store Chinese release dates in canonical numeric form', async () => {
  const { sqlite, service } = fixture();
  try {
    const created = await service.createAdminDevice({
      brand_name: 'test', device_name: 'New Phone', device_category: 'phone', release_date: '2021年9月22日',
    });
    assert.equal(created.release_date, '2021/09/22');
    const edited = await service.updateAdminDevice({ id: created.id, release_date: '2024年2月29日' });
    assert.equal(edited.release_date, '2024/02/29');
    await assert.rejects(() => service.updateAdminDevice({ id: created.id, release_date: '2021年2月29日' }));
    assert.equal(sqlite.prepare('SELECT release_date FROM w_devices WHERE id = ?').get(created.id).release_date, '2024/02/29');
  } finally { sqlite.close(); }
});

const newDevice = (name, extra = {}) => ({
  brand_name: 'test', device_name: name, device_category: 'phone', release_date: '2026/10/07', ...extra,
});

test('folder lookup matches legacy names without name_key using Unicode and case normalization', async () => {
  const { sqlite, service } = fixture();
  try {
    sqlite.exec("UPDATE w_devices SET device_name = 'Ｄｅｖｉｃｅ   Ｏｎｅ', name_key = NULL");
    const rows = await service.listAdminDevices(new URLSearchParams({ brand: 'test', name: 'device one' }));
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, 'device-1');
  } finally { sqlite.close(); }
});

test('creation refuses case-insensitive duplicates across categories and statuses even when confirmed', async () => {
  const { sqlite, service, load } = fixture();
  try {
    sqlite.exec("UPDATE w_devices SET name_key = NULL, status = 'unpublished'");
    await assert.rejects(() => service.createAdminDevice(newDevice('  DEVICE ONE ', {
      device_category: 'os', confirmed_similar_ids: ['device-1'],
    })), /已存在/);
    const route = load(`${root}src/app/api/admin/devices/route.ts`);
    const response = await route.POST({ json: async () => newDevice('device one') });
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.conflict.kind, 'duplicate');
    assert.equal(body.conflict.matches[0].id, 'device-1');
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_devices').get().count, 1);
  } finally { sqlite.close(); }
});

test('similar names require confirmation before creation and return the existing names', async () => {
  const { sqlite, service, load } = fixture();
  try {
    const route = load(`${root}src/app/api/admin/devices/route.ts`);
    const response = await route.POST({ json: async () => newDevice('Device On') });
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.conflict.kind, 'similar');
    assert.equal(body.conflict.matches[0].device_name, 'Device One');
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_devices').get().count, 1);
    const created = await service.createAdminDevice(newDevice('Device On', { confirmed_similar_ids: ['device-1'] }));
    assert.equal(created.device_name, 'Device On');
  } finally { sqlite.close(); }
});

test('confirmation cannot bypass a newly added similar record or a URL collision', async () => {
  const { sqlite, service } = fixture();
  try {
    await assert.rejects(() => service.createAdminDevice(newDevice('Device On', { confirmed_similar_ids: ['wrong-id'] })), /相似/);
    await assert.rejects(() => service.createAdminDevice(newDevice('Device-One', { confirmed_similar_ids: ['device-1'] })), /URL/);
    sqlite.exec(`INSERT INTO w_devices (id, brand_name, device_name, device_slug, device_category, create_date, updated_date)
      VALUES ('device-2', 'test', 'Device Only', 'device-only', 'os', 1, 1)`);
    await assert.rejects(() => service.createAdminDevice(newDevice('Device On', { confirmed_similar_ids: ['device-1'] })), /相似/);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_devices').get().count, 2);
  } finally { sqlite.close(); }
});

test('name lookups and checks find older records beyond the device list limit', async () => {
  const { sqlite, service } = fixture();
  try {
    const insert = sqlite.prepare(`INSERT INTO w_devices (id, brand_name, device_name, device_slug, device_category, create_date, updated_date)
      VALUES (?, 'test', ?, ?, 'phone', 2, 2)`);
    sqlite.exec('BEGIN');
    for (let index = 0; index < 1501; index++) insert.run(`extra-${index}`, `Unrelated ${index}`, `unrelated-${index}`);
    sqlite.exec('COMMIT');
    sqlite.exec('UPDATE w_devices SET name_key = NULL');
    const matches = await service.listAdminDevices(new URLSearchParams({ brand: 'test', name: 'DEVICE ONE' }));
    assert.equal(matches.length, 1);
    assert.equal(matches[0].id, 'device-1');
    const check = await service.checkAdminDeviceName('test', 'Device On');
    assert.equal(check.kind, 'similar');
    assert.equal(check.matches[0].id, 'device-1');
  } finally { sqlite.close(); }
});

test('name checks warn for spacing, punctuation, typos, adjacent versions and model suffixes', async () => {
  const { sqlite, load } = fixture();
  try {
    sqlite.exec("UPDATE w_devices SET device_name = 'Pixel 10', name_key = NULL, device_slug = 'pixel-10'");
    const route = load(`${root}src/app/api/admin/devices/route.ts`);
    for (const name of ['Pixel10', 'Pixel_10', 'Pixle 10', 'Pixel 11', 'Pixel 10 Pro']) {
      const response = await route.GET({ nextUrl: new URL(`https://example.test/api/admin/devices?${new URLSearchParams({ brand: 'test', check_name: name })}`) });
      assert.equal(response.status, 200);
      const { data } = await response.json();
      assert.equal(data.kind, name === 'Pixel_10' ? 'slug' : 'similar', name);
      assert.equal(data.matches[0].id, 'device-1');
    }
  } finally { sqlite.close(); }
});

test('unrelated names and names in another brand can be created without confirmation', async () => {
  const { sqlite, service } = fixture();
  try {
    sqlite.exec("INSERT INTO w_brands (slug,title,title_key,kind,create_date,updated_date) VALUES ('other','Other','other','mobile',1,1)");
    assert.equal((await service.createAdminDevice(newDevice('Completely Different'))).device_name, 'Completely Different');
    assert.equal((await service.createAdminDevice(newDevice('DEVICE ONE', { brand_name: 'other' }))).brand_name, 'other');
  } finally { sqlite.close(); }
});

test('canceling the similarity prompt creates nothing; accepting creates the requested name', async () => {
  const { sqlite, service, load } = fixture();
  try {
    const { createWithAdminNameConfirmation } = load(`${root}src/lib/admin-device-name.ts`);
    let prompts = 0;
    const canceled = await createWithAdminNameConfirmation(newDevice('Device On'), service.createAdminDevice, (message) => {
      prompts++;
      assert.match(message, /Device One/);
      assert.match(message, /Device On/);
      return false;
    });
    assert.equal(canceled, null);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_devices').get().count, 1);
    const created = await createWithAdminNameConfirmation(newDevice('Device On'), service.createAdminDevice, () => {
      prompts++;
      return true;
    });
    assert.equal(created.device_name, 'Device On');
    assert.equal(prompts, 2);
    await assert.rejects(() => createWithAdminNameConfirmation(newDevice('DEVICE ONE'), service.createAdminDevice,
      () => assert.fail('Duplicates must not offer confirmation')), /已存在/);
  } finally { sqlite.close(); }
});

test('device deletion previews every wallpaper beyond one page, then deletes files and both translations', async () => {
  const { sqlite, upload, load, removedObjects } = fixture();
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    for (let index = 0; index < 55; index++) await upload(`still-${index}`);
    await upload('movie', { media_type: 'dynamic', mime_type: 'video/mp4', origin_key: 'live/Test/Device One/origin/movie.mp4' });
    sqlite.exec(`UPDATE w_devices SET status='published'; UPDATE w_wallpapers SET status='published';
      INSERT INTO w_device_i18n (id,device_id,language,display_name,create_date,updated_date) VALUES ('static','device-1','en','Static',1,1);
      INSERT INTO w_live_device_i18n (id,device_id,language,display_name,create_date,updated_date) VALUES ('live','device-1','en','Live',1,1);`);
    const preview = await service.previewAdminDeviceDeletion('device-1');
    assert.equal(preview.wallpapers.length, 56);
    assert.equal(preview.translation_count, 2);
    assert.equal(removedObjects.length, 0);
    await service.deleteAdminDevice({ id: 'device-1', snapshot: preview.snapshot });
    for (const table of ['w_devices', 'w_wallpapers', 'w_device_i18n', 'w_live_device_i18n']) {
      assert.equal(sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count, 0);
    }
    assert.ok(removedObjects.includes('live/Test/Device One/preview/movie.mp4'));
    assert.equal(removedObjects.length, 113);
  } finally { sqlite.close(); }
});

test('device deletion rejects an unreviewed or changed wallpaper list before removing any file', async () => {
  const { sqlite, upload, load, removedObjects } = fixture();
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    await upload('first');
    await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1' }));
    const preview = await service.previewAdminDeviceDeletion('device-1');
    await upload('second');
    await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', snapshot: preview.snapshot }), /变化|变更/);
    assert.equal(removedObjects.length, 0);
    assert.equal(sqlite.prepare('SELECT status FROM w_devices').get().status, 'draft');
  } finally { sqlite.close(); }
});

test('failed device deletion keeps all rows for retry and blocks upload and publishing while locked', async () => {
  let fail = true;
  const { sqlite, service: data, upload, load } = fixture(new Set(), () => {}, (key, db) => {
    assert.equal(db.prepare('SELECT status FROM w_devices').get().status, 'unpublished');
    assert.throws(() => db.exec("UPDATE w_devices SET status='published'"));
    if (fail && key.includes('/compress/')) throw new Error('R2 unavailable');
  });
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    await upload('first');
    const preview = await service.previewAdminDeviceDeletion('device-1');
    await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', snapshot: preview.snapshot }), /重试/);
    assert.equal(sqlite.prepare('SELECT deletion_state FROM w_devices').get().deletion_state, 'pending');
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_wallpapers').get().count, 1);
    await assert.rejects(() => upload('late'));
    await assert.rejects(() => data.updateAdminDevice({ id: 'device-1', status: 'published' }));
    fail = false;
    const retry = await service.previewAdminDeviceDeletion('device-1');
    await service.deleteAdminDevice({ id: 'device-1', snapshot: retry.snapshot });
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_devices').get().count, 0);
  } finally { sqlite.close(); }
});

test('device deletion lists shared files as retained and only deletes the target device references', async () => {
  const { sqlite, upload, load, removedObjects } = fixture();
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    const wallpaper = await upload('shared');
    sqlite.exec(`INSERT INTO w_devices (id,brand_name,device_name,device_slug,device_category,create_date,updated_date)
      VALUES ('other','test','Other','other','phone',1,1);
      INSERT INTO w_wallpapers SELECT 'other-wallpaper','other',name,mime_type,size_bytes,origin_key,compress_key,width,height,
      file_format,theme,media_type,category,is_primary,tags,status,create_date,updated_date,deletion_state FROM w_wallpapers;`);
    const preview = await service.previewAdminDeviceDeletion('device-1');
    assert.equal(preview.files.length, 2);
    assert.ok(preview.files.every((file) => file.shared));
    await service.deleteAdminDevice({ id: 'device-1', snapshot: preview.snapshot });
    assert.equal(removedObjects.length, 0);
    assert.equal(sqlite.prepare('SELECT origin_key FROM w_wallpapers').get().origin_key, wallpaper.origin_key);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_deleted_wallpaper_files').get().count, 0);
  } finally { sqlite.close(); }
});

test('device list reports static, live and pending deletion counts and filters by media', async () => {
  const { sqlite, service, upload } = fixture();
  try {
    await upload('static');
    await upload('live', { media_type: 'dynamic', origin_key: 'test/device/origin/live.mp4' });
    const rows = await service.listAdminDevices(new URLSearchParams({ media: 'dynamic' }));
    assert.equal(rows[0].static_count, 1);
    assert.equal(rows[0].dynamic_count, 1);
    assert.equal(rows[0].wallpaper_count, 2);
    sqlite.exec('DELETE FROM w_wallpapers WHERE media_type = \'dynamic\'');
    assert.equal((await service.listAdminDevices(new URLSearchParams({ media: 'dynamic' }))).length, 0);
    assert.equal((await service.listAdminDevices(new URLSearchParams({ media: 'empty' }))).length, 0);
  } finally { sqlite.close(); }
});

test('device deletion transaction rejects wallpaper changes after the server has checked the snapshot', async () => {
  let mutate = false;
  const { sqlite, upload, load, removedObjects } = fixture(new Set(), () => {}, () => {}, (db) => {
    if (mutate) {
      mutate = false;
      // Deliberately keep the timestamp unchanged to test persisted fields, not just a version number.
      db.exec("UPDATE w_wallpapers SET origin_key='test/device/origin/changed.webp'");
    }
  });
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    await upload('first');
    const preview = await service.previewAdminDeviceDeletion('device-1');
    mutate = true;
    await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', snapshot: preview.snapshot }), /变更/);
    assert.equal(removedObjects.length, 0);
    assert.equal(sqlite.prepare('SELECT deletion_state FROM w_devices').get().deletion_state, 'none');
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_deleted_wallpaper_files').get().count, 0);
  } finally { sqlite.close(); }
});

test('device deletion transaction refuses new sharing introduced after the confirmation snapshot check', async () => {
  let mutate = false;
  const { sqlite, upload, load, removedObjects } = fixture(new Set(), () => {}, () => {}, (db) => {
    if (mutate) {
      mutate = false;
      db.exec(`INSERT INTO w_devices (id,brand_name,device_name,device_slug,device_category,create_date,updated_date)
        VALUES ('other','test','Other','other','phone',1,1);
        INSERT INTO w_wallpapers SELECT 'other-wallpaper','other',name,mime_type,size_bytes,origin_key,compress_key,width,height,
        file_format,theme,media_type,category,is_primary,tags,status,create_date,updated_date,deletion_state FROM w_wallpapers;`);
    }
  });
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    await upload('first');
    const preview = await service.previewAdminDeviceDeletion('device-1');
    mutate = true;
    await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', snapshot: preview.snapshot }), /变更/);
    assert.equal(removedObjects.length, 0);
    assert.equal(sqlite.prepare('SELECT deletion_state FROM w_devices WHERE id=\'device-1\'').get().deletion_state, 'none');
  } finally { sqlite.close(); }
});

test('device deletion handles empty devices and its authenticated API requires a reviewed snapshot', async () => {
  const { sqlite, load, removedObjects } = fixture();
  try {
    const route = load(`${root}src/app/api/admin/devices/route.ts`);
    const missingSnapshot = await route.DELETE({ json: async () => ({ id: 'device-1' }) });
    assert.equal(missingSnapshot.status, 400);
    const response = await route.GET({ nextUrl: new URL('https://example.test/api/admin/devices?delete_preview=device-1') });
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    const { data } = await response.json();
    assert.equal(data.wallpapers.length, 0);
    assert.equal(data.files.length, 0);
    const deleted = await route.DELETE({ json: async () => ({ id: 'device-1', snapshot: data.snapshot, origin_key: 'foreign/origin/secret.webp' }) });
    assert.equal(deleted.status, 200);
    assert.equal((await deleted.json()).deleted, true);
    assert.equal(removedObjects.length, 0);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_devices').get().count, 0);
  } finally { sqlite.close(); }
});

test('device deletion transaction rejects device edits even when they share the previous timestamp', async () => {
  let mutate = false;
  const { sqlite, upload, load, removedObjects } = fixture(new Set(), () => {}, () => {}, (db) => {
    if (mutate) { mutate = false; db.exec("UPDATE w_devices SET device_name='Changed Name'"); }
  });
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    await upload('first');
    const preview = await service.previewAdminDeviceDeletion('device-1');
    mutate = true;
    await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', snapshot: preview.snapshot }), /变更/);
    assert.equal(removedObjects.length, 0);
    assert.equal(sqlite.prepare('SELECT deletion_state FROM w_devices').get().deletion_state, 'none');
  } finally { sqlite.close(); }
});

test('devices sharing files cannot both finish deletion concurrently and orphan the last-owner files', async () => {
  let release;
  let notify;
  const held = new Promise((resolve) => { release = resolve; });
  const started = new Promise((resolve) => { notify = resolve; });
  const { sqlite, upload, load, removedObjects } = fixture(new Set(), () => {}, async (key) => {
    if (key.includes('unique')) { notify(); await held; }
  });
  let first;
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    await upload('shared');
    sqlite.exec(`INSERT INTO w_devices (id,brand_name,device_name,device_slug,device_category,create_date,updated_date)
      VALUES ('other','test','Other','other','phone',1,1);
      INSERT INTO w_wallpapers SELECT 'other-wallpaper','other',name,mime_type,size_bytes,origin_key,compress_key,width,height,
      file_format,theme,media_type,category,is_primary,tags,status,create_date,updated_date,deletion_state FROM w_wallpapers;`);
    await upload('unique');
    const a = await service.previewAdminDeviceDeletion('device-1');
    const b = await service.previewAdminDeviceDeletion('other');
    first = service.deleteAdminDevice({ id: 'device-1', snapshot: a.snapshot });
    await started;
    await assert.rejects(() => service.deleteAdminDevice({ id: 'other', snapshot: b.snapshot }));
    release();
    await first;
    const retry = await service.previewAdminDeviceDeletion('other');
    await service.deleteAdminDevice({ id: 'other', snapshot: retry.snapshot });
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_devices').get().count, 0);
    assert.ok(removedObjects.includes('test/device/origin/shared.webp'));
    assert.ok(removedObjects.includes('test/device/compress/shared.webp'));
  } finally { release(); if (first) await first; sqlite.close(); }
});

test('device deletion requires reconfirmation if retained files lose their other owner before claim', async () => {
  let mutate = false;
  const { sqlite, upload, load, removedObjects } = fixture(new Set(), () => {}, () => {}, (db) => {
    if (mutate) { mutate = false; db.exec("DELETE FROM w_wallpapers WHERE device_id='other'; DELETE FROM w_devices WHERE id='other';"); }
  });
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    await upload('shared');
    sqlite.exec(`INSERT INTO w_devices (id,brand_name,device_name,device_slug,device_category,create_date,updated_date)
      VALUES ('other','test','Other','other','phone',1,1);
      INSERT INTO w_wallpapers SELECT 'other-wallpaper','other',name,mime_type,size_bytes,origin_key,compress_key,width,height,
      file_format,theme,media_type,category,is_primary,tags,status,create_date,updated_date,deletion_state FROM w_wallpapers;`);
    const preview = await service.previewAdminDeviceDeletion('device-1');
    mutate = true;
    await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', snapshot: preview.snapshot }));
    assert.equal(removedObjects.length, 0);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_wallpapers').get().count, 1);
  } finally { sqlite.close(); }
});

test('device deletion uses the database inventory without historical JSON restrictions', async () => {
  const { sqlite, upload, load, removedObjects } = fixture();
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    await upload('static');
    const preview = await service.previewAdminDeviceDeletion('device-1');
    assert.equal(preview.blocked_reason, null);
    await service.deleteAdminDevice({ id: 'device-1', snapshot: preview.snapshot });
    assert.equal(removedObjects.length, 2);
  } finally { sqlite.close(); }
});

test('device deletion dialog renders the full preview list and disables confirmation before loading finishes', async () => {
  const { sqlite, upload, load } = fixture();
  try {
    for (let index = 0; index < 55; index++) await upload(`wallpaper-${index}`);
    const preview = await load(`${root}src/lib/admin-device-deletion.ts`).previewAdminDeviceDeletion('device-1');
    let values;
    let stateIndex;
    const module = { exports: {} };
    const source = ts.transpileModule(readFileSync(`${root}src/app/manager/AdminDeviceDeleteDialog.tsx`, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText;
    runInNewContext(source, {
      module, exports: module.exports, URLSearchParams,
      require(specifier) {
        if (specifier === 'react') return { useState: () => [values[stateIndex++], () => {}],
          useRef: () => ({ current: 0 }), useEffect: () => {}, useCallback: (fn) => fn };
        if (specifier.startsWith('@/')) return load(`${root}src/${specifier.slice(2)}.ts`);
        return require(specifier);
      },
    });
    const props = { device: preview.device, request: () => assert.fail('Rendering cannot delete'), onClose: () => {}, onDeleted: () => {} };
    const { renderToStaticMarkup } = require('react-dom/server');
    values = [preview, false, false, '']; stateIndex = 0;
    const html = renderToStaticMarkup(module.exports.default(props));
    assert.match(html, /壁纸 55 张/);
    for (let index = 0; index < 55; index++) assert.ok(html.includes(`test/device/origin/wallpaper-${index}.webp`));
    values = [null, true, false, '']; stateIndex = 0;
    const loading = renderToStaticMarkup(module.exports.default(props));
    assert.match(loading, /正在读取完整删除清单/);
    assert.match(loading, /<button type="submit" disabled=""/);
  } finally { sqlite.close(); }
});

test('collection deletion only previews and deletes the chosen media and preserves the other collection unchanged', async () => {
  for (const media of ['static', 'dynamic']) {
    const { sqlite, upload, load, removedObjects } = fixture();
    try {
      const service = load(`${root}src/lib/admin-device-deletion.ts`);
      await upload('still');
      await upload('movie', { media_type: 'dynamic', mime_type: 'video/mp4', origin_key: 'live/Test/Device One/origin/movie.mp4', compress_key: 'live/Test/Device One/compress/movie.webp' });
      sqlite.exec(`UPDATE w_devices SET status='published'; UPDATE w_wallpapers SET status='published';
        INSERT INTO w_device_i18n (id,device_id,language,display_name,create_date,updated_date) VALUES ('static','device-1','en','Static',1,1);
        INSERT INTO w_live_device_i18n (id,device_id,language,display_name,create_date,updated_date) VALUES ('live','device-1','en','Live',1,1);`);
      const otherMedia = media === 'static' ? 'dynamic' : 'static';
      const other = sqlite.prepare('SELECT * FROM w_wallpapers WHERE media_type=?').get(otherMedia);
      const parent = sqlite.prepare('SELECT * FROM w_devices').get();
      const preview = await service.previewAdminDeviceDeletion('device-1', media);
      assert.equal(preview.media_type, media);
      assert.equal(preview.wallpapers.length, 1);
      assert.equal(preview.wallpapers[0].media_type, media);
      assert.equal(preview.translation_count, 1);
      await service.deleteAdminDevice({ id: 'device-1', media_type: media, snapshot: preview.snapshot });
      assert.deepEqual(sqlite.prepare('SELECT * FROM w_wallpapers').get(), other);
      assert.deepEqual(sqlite.prepare('SELECT * FROM w_devices').get(), parent);
      const removedTable = media === 'static' ? 'w_device_i18n' : 'w_live_device_i18n';
      const keptTable = media === 'static' ? 'w_live_device_i18n' : 'w_device_i18n';
      assert.equal(sqlite.prepare(`SELECT COUNT(*) AS count FROM ${removedTable}`).get().count, 0);
      assert.equal(sqlite.prepare(`SELECT COUNT(*) AS count FROM ${keptTable}`).get().count, 1);
      assert.equal(removedObjects.length, media === 'static' ? 2 : 3);
      assert.ok(!removedObjects.includes(other.origin_key));
      assert.ok(!removedObjects.includes(other.compress_key));
    } finally { sqlite.close(); }
  }
});

test('collection deletion retains cross-media shared files in the same device and removes the last empty device', async () => {
  const { sqlite, upload, load, removedObjects } = fixture();
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    const still = await upload('shared');
    await upload('movie', { media_type: 'dynamic', mime_type: 'video/mp4', origin_key: 'live/Test/Device One/origin/movie.mp4', compress_key: still.compress_key });
    const preview = await service.previewAdminDeviceDeletion('device-1', 'dynamic');
    assert.equal(preview.files.find((file) => file.key === still.compress_key).shared, true);
    await service.deleteAdminDevice({ id: 'device-1', media_type: 'dynamic', snapshot: preview.snapshot });
    assert.ok(!removedObjects.includes(still.compress_key));
    const last = await service.previewAdminDeviceDeletion('device-1', 'static');
    await service.deleteAdminDevice({ id: 'device-1', media_type: 'static', snapshot: last.snapshot });
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_devices').get().count, 0);
    assert.ok(removedObjects.includes(still.compress_key));
  } finally { sqlite.close(); }
});

test('collection deletion failure locks only that media, retries it, and prevents accidentally switching the reviewed scope', async () => {
  let fail = true;
  const { sqlite, upload, load, removedObjects } = fixture(new Set(), () => {}, (key) => {
    if (fail && key.includes('/compress/')) throw new Error('R2 unavailable');
  });
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    await upload('still');
    await upload('movie', { media_type: 'dynamic', mime_type: 'video/mp4', origin_key: 'live/Test/Device One/origin/movie.mp4' });
    sqlite.exec("UPDATE w_devices SET status='published'; UPDATE w_wallpapers SET status='published'");
    const preview = await service.previewAdminDeviceDeletion('device-1', 'dynamic');
    await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', media_type: 'static', snapshot: preview.snapshot }));
    await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', snapshot: preview.snapshot }));
    assert.equal(removedObjects.length, 0);
    await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', media_type: 'dynamic', snapshot: preview.snapshot }), /重试/);
    assert.equal(sqlite.prepare("SELECT status FROM w_devices").get().status, 'published');
    assert.equal(sqlite.prepare("SELECT deletion_state FROM w_wallpapers WHERE media_type='static'").get().deletion_state, 'none');
    await assert.rejects(() => upload('late-movie', { media_type: 'dynamic', origin_key: 'live/Test/Device One/origin/late.mp4' }));
    await upload('allowed-still');
    const rows = await load(`${root}src/lib/admin-data.ts`).listAdminDevices(new URLSearchParams());
    assert.equal(rows[0].dynamic_deletion_state, 'pending');
    assert.equal(rows[0].static_deletion_state, 'none');
    fail = false;
    const retry = await service.previewAdminDeviceDeletion('device-1', 'dynamic');
    await service.deleteAdminDevice({ id: 'device-1', media_type: 'dynamic', snapshot: retry.snapshot });
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM w_wallpapers WHERE media_type='static'").get().count, 2);
  } finally { sqlite.close(); }
});

test('collection deletion API requires valid media and a snapshot from the same scoped preview', async () => {
  const { sqlite, upload, load, removedObjects } = fixture();
  try {
    await upload('still');
    await upload('movie', { media_type: 'dynamic', origin_key: 'live/Test/Device One/origin/movie.mp4' });
    const route = load(`${root}src/app/api/admin/devices/route.ts`);
    const request = (media) => ({ nextUrl: new URL(`https://example.test/api/admin/devices?delete_preview=device-1&media_type=${media}`) });
    assert.equal((await route.GET(request('invalid'))).status, 400);
    assert.equal((await route.GET({ nextUrl: new URL('https://example.test/api/admin/devices?delete_preview=device-1') })).status, 400);
    const whole = await load(`${root}src/lib/admin-device-deletion.ts`).previewAdminDeviceDeletion('device-1');
    assert.equal((await route.DELETE({ json: async () => ({ id: 'device-1', snapshot: whole.snapshot }) })).status, 400);
    assert.equal(removedObjects.length, 0);
    const { data } = await (await route.GET(request('dynamic'))).json();
    assert.equal(data.wallpapers.length, 1);
    const result = await route.DELETE({ json: async () => ({ id: 'device-1', media_type: 'dynamic', snapshot: data.snapshot }) });
    assert.equal(result.status, 200);
    assert.equal(sqlite.prepare('SELECT media_type FROM w_wallpapers').get().media_type, 'static');
    assert.ok(removedObjects.length > 0);
  } finally { sqlite.close(); }
});

test('collection deletion rechecks selected rows and sharing inside the claim transaction', async () => {
  for (const change of ['file', 'sharing']) {
    let mutate = false;
    const { sqlite, upload, load, removedObjects } = fixture(new Set(), () => {}, () => {}, (db) => {
      if (!mutate) return;
      mutate = false;
      if (change === 'file') db.exec("UPDATE w_wallpapers SET origin_key='live/Test/Device One/origin/changed.mp4' WHERE media_type='dynamic'");
      else db.exec("UPDATE w_wallpapers SET compress_key=(SELECT compress_key FROM w_wallpapers WHERE media_type='dynamic') WHERE media_type='static'");
    });
    try {
      const service = load(`${root}src/lib/admin-device-deletion.ts`);
      await upload('still');
      await upload('movie', { media_type: 'dynamic', origin_key: 'live/Test/Device One/origin/movie.mp4' });
      const preview = await service.previewAdminDeviceDeletion('device-1', 'dynamic');
      mutate = true;
      await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', media_type: 'dynamic', snapshot: preview.snapshot }), /变更/);
      assert.equal(removedObjects.length, 0);
      assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_collection_deletions').get().count, 0);
    } finally { sqlite.close(); }
  }
});

test('same-device collections sharing a cover cannot concurrently delete and leave the last file orphaned', async () => {
  let release;
  let notify;
  const held = new Promise((resolve) => { release = resolve; });
  const started = new Promise((resolve) => { notify = resolve; });
  const { sqlite, upload, load, removedObjects } = fixture(new Set(), () => {}, async (key) => {
    if (key.includes('movie.mp4')) { notify(); await held; }
  });
  let first;
  try {
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    const still = await upload('shared');
    await upload('movie', { media_type: 'dynamic', origin_key: 'live/Test/Device One/origin/movie.mp4', compress_key: still.compress_key });
    const dynamic = await service.previewAdminDeviceDeletion('device-1', 'dynamic');
    const staticPreview = await service.previewAdminDeviceDeletion('device-1', 'static');
    first = service.deleteAdminDevice({ id: 'device-1', media_type: 'dynamic', snapshot: dynamic.snapshot });
    await started;
    await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', media_type: 'static', snapshot: staticPreview.snapshot }));
    release();
    await first;
    const retry = await service.previewAdminDeviceDeletion('device-1', 'static');
    await service.deleteAdminDevice({ id: 'device-1', media_type: 'static', snapshot: retry.snapshot });
    assert.ok(removedObjects.includes(still.compress_key));
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_devices').get().count, 0);
  } finally { release(); if (first) await first; sqlite.close(); }
});

test('collection deletion preserves translations of an empty other media collection', async () => {
  const { sqlite, upload, load } = fixture();
  try {
    await upload('still');
    sqlite.exec("INSERT INTO w_live_device_i18n (id,device_id,language,display_name,create_date,updated_date) VALUES ('empty-live','device-1','en','Future live collection',1,1)");
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    const preview = await service.previewAdminDeviceDeletion('device-1', 'static');
    const deleted = await service.deleteAdminDevice({ id: 'device-1', media_type: 'static', snapshot: preview.snapshot });
    assert.equal(deleted.device_deleted, false);
    assert.equal(sqlite.prepare('SELECT display_name FROM w_live_device_i18n').get().display_name, 'Future live collection');
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_devices').get().count, 1);
  } finally { sqlite.close(); }
});

test('collection deletion reconfirms edited translations, including changes between preview validation and claim', async () => {
  for (const timing of ['preview', 'claim']) {
    let mutate = false;
    const { sqlite, upload, load, removedObjects } = fixture(new Set(), () => {}, () => {}, (db) => {
      if (mutate) { mutate = false; db.exec("UPDATE w_device_i18n SET display_name='Edited', updated_date=1"); }
    });
    try {
      await upload('still');
      sqlite.exec("INSERT INTO w_device_i18n (id,device_id,language,display_name,create_date,updated_date) VALUES ('static','device-1','en','Original',1,1)");
      const service = load(`${root}src/lib/admin-device-deletion.ts`);
      const preview = await service.previewAdminDeviceDeletion('device-1', 'static');
      if (timing === 'preview') sqlite.exec("UPDATE w_device_i18n SET display_name='Edited', updated_date=1");
      else mutate = true;
      await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', media_type: 'static', snapshot: preview.snapshot }), /变更/);
      assert.equal(removedObjects.length, 0);
      assert.equal(sqlite.prepare('SELECT display_name FROM w_device_i18n').get().display_name, 'Edited');
    } finally { sqlite.close(); }
  }
});

test('collection deletion blocks selected translation saves and removal during processing but allows other media edits', async () => {
  let service;
  let checked = false;
  const { sqlite, upload, load } = fixture(new Set(), () => {}, async () => {
    if (checked) return;
    checked = true;
    await assert.rejects(() => service.saveAdminDeviceI18n({ device_id: 'device-1', media_type: 'dynamic', language: 'en', display_name: 'Late live' }));
    await assert.rejects(() => service.deleteAdminDeviceI18n({ device_id: 'device-1', media_type: 'dynamic', language: 'en' }));
    await service.saveAdminDeviceI18n({ device_id: 'device-1', media_type: 'static', language: 'en', display_name: 'Kept still' });
  });
  try {
    service = load(`${root}src/lib/admin-device-i18n.ts`);
    await upload('still');
    await upload('movie', { media_type: 'dynamic', origin_key: 'live/Test/Device One/origin/movie.mp4' });
    sqlite.exec("INSERT INTO w_live_device_i18n (id,device_id,language,display_name,create_date,updated_date) VALUES ('live','device-1','en','Live',1,1)");
    const deletion = load(`${root}src/lib/admin-device-deletion.ts`);
    const preview = await deletion.previewAdminDeviceDeletion('device-1', 'dynamic');
    await deletion.deleteAdminDevice({ id: 'device-1', media_type: 'dynamic', snapshot: preview.snapshot });
    assert.equal(checked, true);
    assert.equal(sqlite.prepare('SELECT display_name FROM w_device_i18n').get().display_name, 'Kept still');
  } finally { sqlite.close(); }
});

test('a rejected collection claim cannot use a concurrent winner with the same timestamp to mark shared files deleted', async () => {
  let mutate = false;
  const { sqlite, upload, load, removedObjects } = fixture(new Set(), () => {}, () => {}, (db) => {
    if (!mutate) return;
    mutate = false;
    db.exec(`INSERT INTO w_devices (id,brand_name,device_name,device_slug,device_category,create_date,updated_date)
      VALUES ('other','test','Other','other','phone',1,1);
      INSERT INTO w_wallpapers SELECT 'other-wallpaper','other',name,mime_type,size_bytes,origin_key,compress_key,width,height,
      file_format,theme,media_type,category,is_primary,tags,status,create_date,updated_date,deletion_state FROM w_wallpapers;`);
    const hasToken = db.prepare("SELECT name FROM pragma_table_info('w_collection_deletions') WHERE name='lease_token'").get();
    db.exec(`INSERT INTO w_collection_deletions (device_id,media_type,deletion_state,updated_date${hasToken ? ',lease_token' : ''})
      VALUES ('device-1','static','processing',1001${hasToken ? ",'winner-token'" : ''});
      UPDATE w_wallpapers SET status='unpublished',is_primary=0,deletion_state='processing',updated_date=1001 WHERE device_id='device-1';`);
  }, { fixedNow: 1000 });
  try {
    await upload('shared');
    const service = load(`${root}src/lib/admin-device-deletion.ts`);
    const preview = await service.previewAdminDeviceDeletion('device-1', 'static');
    mutate = true;
    await assert.rejects(() => service.deleteAdminDevice({ id: 'device-1', media_type: 'static', snapshot: preview.snapshot }), /变更/);
    assert.equal(removedObjects.length, 0);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_deleted_wallpaper_files').get().count, 0);
  } finally { sqlite.close(); }
});

test('legacy whole-device retries lock translation writes and recheck full translation content at claim', async () => {
  let mutate = false;
  const { sqlite, upload, load, removedObjects } = fixture(new Set(), () => {}, () => {}, (db) => {
    if (mutate) { mutate = false; db.exec("UPDATE w_device_i18n SET display_name='Edited',updated_date=1"); }
  });
  try {
    await upload('still');
    sqlite.exec("INSERT INTO w_device_i18n (id,device_id,language,display_name,create_date,updated_date) VALUES ('static','device-1','en','Original',1,1)");
    const deletion = load(`${root}src/lib/admin-device-deletion.ts`);
    const preview = await deletion.previewAdminDeviceDeletion('device-1');
    mutate = true;
    await assert.rejects(() => deletion.deleteAdminDevice({ id: 'device-1', snapshot: preview.snapshot }), /变更/);
    assert.equal(removedObjects.length, 0);
    sqlite.exec("UPDATE w_devices SET status='unpublished',deletion_state='pending'");
    const translations = load(`${root}src/lib/admin-device-i18n.ts`);
    await assert.rejects(() => translations.saveAdminDeviceI18n({ device_id: 'device-1', language: 'en', display_name: 'Late edit' }));
    await assert.rejects(() => translations.deleteAdminDeviceI18n({ device_id: 'device-1', language: 'en' }));
    assert.throws(() => sqlite.exec("UPDATE w_device_i18n SET display_name='Direct late edit'"));
  } finally { sqlite.close(); }
});
