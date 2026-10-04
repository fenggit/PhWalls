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
          headR2Object: async (key) => {
            onHead(key, sqlite);
            return missingFiles.has(key) ? null : { size: 100, mimeType: 'image/webp' };
          },
        };
        if (specifier === '@/lib/admin-static-assets') return {};
        if (specifier === '@/lib/admin-auth') return { requireAdmin: async () => null };
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
