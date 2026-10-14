import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sqliteD1 } from '../scripts/tests/sqlite-d1.mjs';
import { createTsLoader } from '../scripts/tests/load-ts.mjs';

test('D1 desktop cover and search indexes preserve separate static and dynamic collections', async (t) => {
  const db = sqliteD1(t);
  db.seed([
    { sql: "INSERT INTO w_devices(id,brand_name,device_name,device_slug,device_category,release_date,status,create_date,updated_date) VALUES('mixed-desktop','microsoft-windows','Mixed desktop','stable-desktop','desktop','2026-01-01','published',1,1)" },
    ...[['still','static','image/png'],['movie1','dynamic','video/mp4'],['movie2','dynamic','video/mp4']].map(([name, media, mime]) => ({
      sql: "INSERT INTO w_wallpapers(id,device_id,name,mime_type,origin_key,compress_key,file_format,media_type,category,status,create_date,updated_date) VALUES(?,'mixed-desktop',?,?,?,?,'png',?,'desktop','published',1,1)",
      params: [name,name,mime,`desktopwalls/windows/origin/${name}`,`desktopwalls/windows/compress/${name}`,media],
    })),
  ]);
  const load = createTsLoader({ '@cloudflare/next-on-pages': { getOptionalRequestContext: () => ({ env: { DB: db } }) } });
  const service = load('src/lib/wallpaper-db.ts');
  const covers = (await service.loadDbIndex(['microsoft-windows']))['microsoft-windows'];
  assert.equal(covers.length, 2);
  assert.deepEqual(covers.map(collection => collection.count).sort(), [1, 2]);
  const entries = (await service.loadDbSearchIndex()).filter(entry => entry.slug === 'stable-desktop');
  assert.equal(entries.length, 2);
  assert.ok(entries.every(entry => entry.desktop));
  assert.equal(entries.find(entry => !entry.live).count, 1);
  assert.equal(entries.find(entry => entry.live).count, 2);
});
