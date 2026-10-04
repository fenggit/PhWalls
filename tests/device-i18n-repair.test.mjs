import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { planDeviceI18nRepair, buildRepairSql } from '../scripts/repair-device-i18n.mjs';
import { localizeDeviceName, localizeDeviceText } from '../scripts/device-localization.mjs';

const samsung = { id: 'translation-1', device_id: 'device-1', brand_name: 'samsung', device_name: 'Samsung Galaxy A01',
  language: 'zh', display_name: null, seo_title: 'Samsung Galaxy A01 壁纸',
  description: '收录4张三星 Galaxy A01壁纸，提供1080×2400 PNG原图。', create_date: 10, updated_date: 20 };

test('repair changes names consistently while retaining authored text, facts and record identity', () => {
  const changes = planDeviceI18nRepair([samsung]);
  assert.equal(changes.length, 1);
  assert.equal(changes[0].after.display_name, '三星 Galaxy A01');
  assert.equal(changes[0].after.seo_title, '三星 Galaxy A01 壁纸');
  assert.equal(changes[0].after.description, samsung.description);
  assert.equal(changes[0].before.updated_date, 20);
  assert.equal(planDeviceI18nRepair([{ ...samsung, ...changes[0].after }]).length, 0);
});

test('brand translations are case-insensitive and repeated repairs do not duplicate localized prefixes', () => {
  assert.equal(localizeDeviceName('huawei', 'HUAWEI Pura 70', 'zh'), '华为 Pura 70');
  assert.equal(localizeDeviceName('sony', 'Sony Xperia 1', 'zh'), '索尼 Xperia 1');
  assert.equal(localizeDeviceName('smartisan', 'Smartisan Nut R2', 'zh-hant'), '堅果 R2');
  assert.equal(localizeDeviceName('smartisan', 'Smartisan Nut R2', 'vi'), 'Smartisan Nut R2');
  const moto = { brand_name: 'motorola', device_name: 'Moto E20' };
  const text = localizeDeviceText(moto, 'Moto E20 壁纸', 'zh');
  assert.equal(text, '摩托罗拉 Moto E20 壁纸');
  assert.equal(localizeDeviceText(moto, text, 'zh'), text);
  assert.equal(localizeDeviceText(samsung, 'Samsung Galaxy A010 壁纸', 'zh'), 'Samsung Galaxy A010 壁纸');
  assert.equal(localizeDeviceText({ brand_name: 'huawei', device_name: 'Huawei Enjoy 70X' }, '华为 Enjoy 70X壁纸', 'zh'), '华为 畅享 70X壁纸');
  assert.equal(localizeDeviceText({ brand_name: 'redmi', device_name: 'Xiaomi Redmi Note 9' }, '小米 Redmi Note 9壁纸', 'zh'), '红米 Note 9壁纸');
});

test('repair SQL retains timestamps and honors guards against newer administrator edits', () => {
  const db = new DatabaseSync(':memory:');
  try {
    for (const file of ['0001_wallpaper_admin.sql', '0008_device_descriptions.sql', '0009_device_description_name.sql', '0010_device_i18n.sql']) {
      db.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), 'utf8'));
    }
    db.prepare(`INSERT INTO w_devices (id,brand_name,device_name,device_slug,device_category,create_date,updated_date)
      VALUES ('device-1','samsung','Samsung Galaxy A01','samsung-galaxy-a01','phone',1,1)`).run();
    db.prepare(`INSERT INTO w_device_i18n (id,device_id,language,display_name,seo_title,description,create_date,updated_date)
      VALUES (?,?,?,?,?,?,?,?)`).run(samsung.id, samsung.device_id, samsung.language, samsung.display_name,
        samsung.seo_title, samsung.description, samsung.create_date, samsung.updated_date);
    const sql = buildRepairSql(planDeviceI18nRepair([samsung]), 100);
    db.exec(sql);
    const row = db.prepare('SELECT * FROM w_device_i18n').get();
    assert.equal(row.display_name, '三星 Galaxy A01');
    assert.equal(row.create_date, 10);
    assert.equal(row.updated_date, 100);
    assert.equal(row.id, samsung.id);
    db.prepare("UPDATE w_device_i18n SET seo_title = '管理员新标题', updated_date=101").run();
    db.exec(sql);
    assert.equal(db.prepare('SELECT seo_title FROM w_device_i18n').get().seo_title, '管理员新标题');
    assert.equal(db.prepare('SELECT device_slug FROM w_devices').get().device_slug, 'samsung-galaxy-a01');
  } finally { db.close(); }
});
