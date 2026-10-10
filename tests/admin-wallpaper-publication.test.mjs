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

function fixture(missingFiles = new Set(), onHead = () => {}) {
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
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const source = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    runInNewContext(source, {
      module, exports: module.exports, crypto: globalThis.crypto, Date, Error, URL, TextEncoder,
      require(specifier) {
        if (specifier === '@/lib/wallpaper-db') return { getWallpaperDb: () => db };
        if (specifier === '@/lib/r2-upload') return {
          createR2UploadUrl: async (key) => `https://uploads.example/${encodeURIComponent(key)}`,
          createUploadGrant: async (key) => key,
          verifyUploadGrant: async (token) => JSON.parse(token),
          headR2Object: async (key) => {
            onHead(key, sqlite);
            const existing = sqlite.prepare('SELECT 1 FROM w_wallpapers WHERE origin_key = ? OR compress_key = ?').get(key, key);
            return missingFiles.has(key) || !existing ? null : { size: 100, mimeType: 'image/webp' };
          },
        };
        if (specifier === '@/lib/admin-static-assets') return {};
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
  return { sqlite, service, upload, load };
}

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
