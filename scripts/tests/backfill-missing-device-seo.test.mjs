import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { buildMissingSeoPlan, collectionInventory, buildPlanSql } from '../backfill-missing-device-seo.mjs';

function fixture(t) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec(`CREATE TABLE w_devices(id TEXT PRIMARY KEY,brand_name TEXT,device_name TEXT,device_slug TEXT,device_category TEXT,status TEXT,deletion_state TEXT);
    CREATE TABLE w_wallpapers(id TEXT PRIMARY KEY,device_id TEXT,media_type TEXT,status TEXT,deletion_state TEXT,file_format TEXT);
    CREATE TABLE w_collection_deletions(device_id TEXT,media_type TEXT);
    CREATE TABLE w_device_i18n(id TEXT PRIMARY KEY,device_id TEXT,language TEXT,display_name TEXT,seo_title TEXT,description TEXT,create_date INTEGER,updated_date INTEGER,UNIQUE(device_id,language));
    CREATE TABLE w_live_device_i18n(id TEXT PRIMARY KEY,device_id TEXT,language TEXT,display_name TEXT,seo_title TEXT,description TEXT,create_date INTEGER,updated_date INTEGER,UNIQUE(device_id,language));
    INSERT INTO w_devices VALUES('mixed','huawei','Huawei Test','test','phone','published','none'),('live','nubia','Nubia Live','live','phone','draft','none'),('empty','nubia','Nubia Empty','empty','phone','published','none'),('deleting','nubia','Deleting','deleting','phone','published','processing');
    INSERT INTO w_wallpapers VALUES('s','mixed','static','published','none','png'),('s-private','mixed','static','draft','none','jpg'),('s-deleting','mixed','static','published','processing','jpg'),('l','mixed','dynamic','published','none','mp4'),('live-draft','live','dynamic','draft','none','mp4'),('deleted-device','deleting','static','published','none','jpg');
    INSERT INTO w_device_i18n VALUES('authored','mixed','zh','保留名称',' \t\n','　',1,2);
    INSERT INTO w_live_device_i18n VALUES('live-authored','mixed','en','Keep name','Keep title',NULL,1,2);`);
  return db;
}

test('inventory scopes actual media, includes drafts, and excludes deleting and asset-less devices', t => {
  const db = fixture(t);
  const inv = collectionInventory(db);
  assert.deepEqual(inv.map(x => [x.id, x.media_type, x.wallpaper_count]), [['mixed','static',1],['mixed','dynamic',1],['live','dynamic',1]]);
  assert.equal(inv[0].active_count, 2);
  assert.equal(inv[0].file_formats, 'png');
  db.exec("INSERT INTO w_collection_deletions VALUES('live','dynamic')");
  assert.equal(collectionInventory(db).length, 2);
});

test('backfill preserves authored fields, fills Unicode whitespace, is idempotent and exactly rolls back', t => {
  const db = fixture(t);
  const before = db.prepare('SELECT * FROM w_device_i18n').all();
  const liveBefore = db.prepare('SELECT * FROM w_live_device_i18n').all();
  const plan = buildMissingSeoPlan(db, 123456);
  const sql = buildPlanSql(plan);
  db.exec(sql.apply);
  const authored = db.prepare("SELECT * FROM w_device_i18n WHERE id='authored'").get();
  assert.equal(authored.display_name, '保留名称');
  assert.ok(authored.seo_title.trim());
  assert.ok(authored.description.trim());
  const live = db.prepare("SELECT * FROM w_live_device_i18n WHERE id='live-authored'").get();
  assert.equal(live.seo_title, 'Keep title');
  assert.equal(buildMissingSeoPlan(db, 123456).changes.length, 0);
  db.exec(sql.apply);
  db.exec(sql.rollback);
  assert.deepEqual(db.prepare('SELECT * FROM w_device_i18n').all(), before);
  assert.deepEqual(db.prepare('SELECT * FROM w_live_device_i18n').all(), liveBefore);
});

test('snapshot guards preserve concurrent edits and rollback skips subsequent authored changes', t => {
  const db = fixture(t);
  const plan = buildMissingSeoPlan(db, 123456);
  const sql = buildPlanSql(plan);
  db.exec("UPDATE w_device_i18n SET seo_title='New title' WHERE id='authored'");
  db.exec(sql.apply);
  assert.equal(db.prepare("SELECT seo_title FROM w_device_i18n WHERE id='authored'").get().seo_title, 'New title');
  db.exec("UPDATE w_live_device_i18n SET description='Later edit' WHERE device_id='live' AND language='en'");
  db.exec(sql.rollback);
  assert.equal(db.prepare("SELECT description FROM w_live_device_i18n WHERE device_id='live' AND language='en'").get().description, 'Later edit');
});

test('asset count, format, and collection deletion changes prevent stale SEO inserts', t => {
  const db = fixture(t);
  const sql = buildPlanSql(buildMissingSeoPlan(db, 123456));
  db.exec("UPDATE w_wallpapers SET file_format='webm' WHERE id='l'; INSERT INTO w_collection_deletions VALUES('live','dynamic'); INSERT INTO w_wallpapers VALUES('new','mixed','static','published','none','png')");
  db.exec(sql.apply);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM w_live_device_i18n').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM w_device_i18n').get().n, 1);
});

test('live SEO names the actual formats rather than assuming MP4', t => {
  const db = fixture(t);
  db.exec("UPDATE w_wallpapers SET file_format='webm' WHERE id='l'");
  const plan = buildMissingSeoPlan(db, 123456);
  const row = plan.changes.find(change => change.device.id === 'mixed' && change.device.media_type === 'dynamic' && change.after.language === 'zh');
  assert.match(row.after.seo_title, /WEBM/);
  assert.doesNotMatch(row.after.description, /MP4/);
});
