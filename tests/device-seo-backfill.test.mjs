import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildDeviceSeoRows, buildInsertSql, classifyCollection } from '../scripts/backfill-device-seo.mjs';

const device = {
  id: 'device-1', brand_name: 'oppo', device_name: 'Oppo Find X10', device_slug: 'oppo-find-x10',
  device_category: 'phone', wallpaper_count: 4, dynamic_count: 0, dark_count: 0, light_count: 0,
  file_formats: 'png', min_width: 1080, max_width: 1080, min_height: 2400, max_height: 2400,
  asset_names: 'oppo-find-x10-gray-silver-gradient|oppo-find-x10-brown-gray-gradient',
};

test('produces all five locally worded SEO titles with real collection facts', () => {
  const rows = buildDeviceSeoRows(device);
  assert.deepEqual(rows.map((row) => row.language), ['en', 'zh', 'ja', 'vi', 'zh-hant']);
  assert.equal(rows.find((row) => row.language === 'zh').seo_title, 'OPPO Find X10 壁纸');
  assert.equal(rows.find((row) => row.language === 'zh-hant').seo_title, 'OPPO Find X10 桌布');
  assert.match(rows.find((row) => row.language === 'ja').seo_title, /の壁紙/);
  assert.match(rows.find((row) => row.language === 'vi').seo_title, /^Hình nền /);
  assert.ok(!rows.find((row) => row.language === 'en').description.includes('Preview 1080×2400'));
  assert.ok(!rows.find((row) => row.language === 'ja').description.includes('1080×2400ピクセルのPNG画像をプレビュー'));
  for (const row of rows) {
    assert.ok(row.description.includes('4'));
    assert.ok(row.description.includes('1080×2400'));
    assert.ok(row.description.includes('PNG'));
    assert.ok(!/4K|8K|official|公式|官方|無水印|无水印|hình nền động/i.test(row.description));
    assert.ok(row.seo_title.length <= 200 && row.description.length <= 5000);
  }
});

test('device names override misleading database categories when writing use cases', () => {
  assert.equal(classifyCollection({ ...device, device_name: 'Huawei MateBook Fold', device_category: 'phone_fold' }), 'desktop');
  assert.equal(classifyCollection({ ...device, device_name: 'Microsoft Surface Duo 2', device_category: 'desktop' }), 'fold');
  assert.equal(classifyCollection({ ...device, device_name: 'Microsoft Surface Duo & Neo', device_category: 'desktop' }), 'mixed');
  assert.equal(classifyCollection({ ...device, device_name: 'Ubuntu 24.04 Mobile Phone', device_category: 'desktop' }), 'phone');
  assert.equal(classifyCollection({ ...device, device_name: 'Huawei MatePad Pro', device_category: 'phone' }), 'pad');
  const desktop = { ...device, device_name: 'Smartisan TNT Desktop', device_category: 'phone' };
  assert.equal(classifyCollection(desktop), 'desktop');
  assert.ok(!buildDeviceSeoRows(desktop).find((row) => row.language === 'en').seo_title.includes('Desktop Desktop'));
});

test('does not invent a combined resolution from independent min and max bounds', () => {
  const rows = buildDeviceSeoRows({ ...device, min_width: 800, max_width: 2400, min_height: 1000, max_height: 1600 });
  for (const row of rows) assert.ok(!row.description.includes('2400×1600') && !row.description.includes('800×1000'));
});

test('does not mistake a model codename for a wallpaper color', () => {
  const rows = buildDeviceSeoRows({ ...device, device_name: 'Android 11 (Red Velvet Cake)',
    device_slug: 'android-11-red-velvet-cake',
    asset_names: 'android-11-red-velvet-cake-gray-gradient|android-11-red-velvet-cake-white-gradient' });
  assert.ok(!rows.find((row) => row.language === 'zh').description.includes('红色'));
  assert.ok(!rows.find((row) => row.language === 'ja').description.includes('レッド'));
  const author = buildDeviceSeoRows({ ...device, device_name: 'Chrome OS 71 Made by Canvas Russ Gray',
    device_slug: 'chrome-os-71-made-by-canvas-russ-gray', asset_names: 'russ-gray-blue-gradient|russ-gray-green-gradient' });
  assert.ok(!author.find((row) => row.language === 'zh').description.includes('灰色'));
});

test('insert SQL safely handles quotes and preserves an existing administrator description', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec('PRAGMA foreign_keys = ON');
    for (const migration of ['0001_wallpaper_admin.sql', '0008_device_descriptions.sql', '0009_device_description_name.sql', '0010_device_i18n.sql']) {
      db.exec(readFileSync(new URL(`../migrations/${migration}`, import.meta.url), 'utf8'));
    }
    db.prepare(`INSERT INTO w_devices (id, brand_name, device_name, device_slug, device_category, create_date, updated_date)
      VALUES (?, 'oppo', ?, 'oppo-find-x10', 'phone', 1, 1)`).run(device.id, "Oppo's Phone");
    db.prepare(`INSERT INTO w_device_i18n (id,device_id,seo_title,description,language,create_date,updated_date)
      VALUES ('manual', ?, 'Manual title', 'Manual description', 'zh', 1, 2)`).run(device.id);
    const rows = buildDeviceSeoRows({ ...device, device_name: "Oppo's Phone" });
    db.exec(buildInsertSql(rows, 123456789));
    db.exec(buildInsertSql(rows, 123456789));
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM w_device_i18n').get().count, 5);
    assert.equal(db.prepare("SELECT seo_title FROM w_device_i18n WHERE language = 'zh'").get().seo_title, 'Manual title');
    assert.ok(db.prepare("SELECT seo_title FROM w_device_i18n WHERE language = 'en'").get().seo_title.includes("OPPO's Phone"));
    assert.equal(db.prepare("SELECT updated_date FROM w_device_i18n WHERE language = 'zh'").get().updated_date, 2);
  } finally { db.close(); }
});

test('all language rows persist a display name and use it consistently in SEO copy', () => {
  const rows = buildDeviceSeoRows({ ...device, brand_name: 'samsung', device_name: 'Samsung Galaxy A01', device_slug: 'samsung-galaxy-a01' });
  const zh = rows.find(row => row.language === 'zh');
  assert.equal(zh.display_name, '三星 Galaxy A01');
  assert.equal(zh.seo_title, '三星 Galaxy A01 壁纸');
  assert.ok(zh.description.includes('三星 Galaxy A01'));
  assert.ok(!zh.description.includes('Samsung'));
  assert.equal(rows.find(row => row.language === 'zh-hant').display_name, '三星 Galaxy A01');
  assert.equal(rows.find(row => row.language === 'ja').display_name, 'サムスン Galaxy A01');
  assert.equal(rows.find(row => row.language === 'vi').display_name, 'Samsung Galaxy A01');
  assert.ok(rows.every(row => typeof row.display_name === 'string' && row.display_name.length > 0));
  const huawei = buildDeviceSeoRows({ ...device, brand_name: 'huawei', device_name: 'HUAWEI Pura 70' });
  assert.equal(huawei.find(row => row.language === 'zh').display_name, '华为 Pura 70');
  const smartisan = buildDeviceSeoRows({ ...device, brand_name: 'smartisan', device_name: 'Smartisan Nut R2' });
  assert.equal(smartisan.find(row => row.language === 'zh').display_name, '坚果 R2');
  assert.equal(smartisan.find(row => row.language === 'en').display_name, 'Smartisan Nut R2');
});
