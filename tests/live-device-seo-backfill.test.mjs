import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { buildLiveDeviceSeoRows, buildLiveInsertSql } from '../scripts/backfill-live-device-seo.mjs';

const device = { id: 's25', brand_name: 'samsung', device_name: 'Samsung Galaxy S25', wallpaper_count: 2, file_formats: 'mp4' };

test('live SEO uses each locale’s wallpaper vocabulary and actual video inventory', () => {
  const rows = buildLiveDeviceSeoRows(device);
  assert.equal(rows.length, 5);
  const byLanguage = Object.fromEntries(rows.map(row => [row.language, row]));
  assert.match(byLanguage.en.seo_title, /Samsung Galaxy S25 Live Wallpapers/);
  assert.match(byLanguage.zh.seo_title, /三星 Galaxy S25动态壁纸/);
  assert.match(byLanguage.ja.seo_title, /ライブ壁紙/);
  assert.match(byLanguage.vi.seo_title, /Hình nền động Samsung Galaxy S25/);
  assert.match(byLanguage['zh-hant'].seo_title, /三星 Galaxy S25動態桌布/);
  for (const row of rows) {
    assert.ok(row.description.includes('2'));
    assert.ok(row.description.includes('MP4'));
    assert.ok(!/原图|原圖|PNG|4K|8K|official|公式|官方/.test(row.description));
    assert.ok(row.seo_title.length <= 200 && row.description.length <= 5000);
    assert.equal(row.media_type, 'dynamic');
  }
  assert.match(buildLiveDeviceSeoRows({ ...device, wallpaper_count: 1 })[0].description, /1 .* live wallpaper\./);
  assert.throws(() => buildLiveDeviceSeoRows({ ...device, wallpaper_count: 0 }));
});

test('live backfill preserves static text and existing live edits and is safe to rerun', () => {
  const sqlite = new DatabaseSync(':memory:');
  try {
    for (const name of ['0001_wallpaper_admin', '0006_wallpaper_deletion_state', '0007_deleted_wallpaper_files', '0008_device_descriptions', '0009_device_description_name', '0010_device_i18n', '0012_collection_media_scope']) {
      sqlite.exec(readFileSync(new URL(`../migrations/${name}.sql`, import.meta.url), 'utf8'));
    }
    sqlite.exec(`INSERT INTO w_devices (id,brand_name,device_name,device_slug,device_category,create_date,updated_date)
      VALUES ('s25','samsung','Samsung Galaxy S25','samsung-galaxy-s25','phone',1,1);
      INSERT INTO w_device_i18n (id,device_id,language,description,create_date,updated_date) VALUES ('static','s25','zh','静态原图描述',1,1);
      INSERT INTO w_live_device_i18n (id,device_id,language,description,create_date,updated_date) VALUES ('manual-live','s25','ja','管理者のライブ壁紙説明',1,1);`);
    const sql = buildLiveInsertSql(buildLiveDeviceSeoRows(device), 100);
    sqlite.exec(sql); sqlite.exec(sql);
    assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM w_live_device_i18n').get().count, 5);
    assert.equal(sqlite.prepare('SELECT description FROM w_device_i18n').get().description, '静态原图描述');
    assert.equal(sqlite.prepare("SELECT description FROM w_live_device_i18n WHERE language='ja'").get().description, '管理者のライブ壁紙説明');
    assert.equal(sqlite.prepare("SELECT seo_title FROM w_live_device_i18n WHERE language='zh'").get().seo_title, '三星 Galaxy S25动态壁纸免费下载 - MP4 视频');
  } finally { sqlite.close(); }
});
