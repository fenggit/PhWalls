import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { buildScenePlan, sceneSql, isGeneratedDescription } from '../backfill-collection-scenes.mjs';

test('obsolete generated mixed counts can be replaced while model-specific facts remain editorial', () => {
  assert.equal(isGeneratedDescription('Browse 17 LG Velvet 2 Pro wallpapers for your home or lock screen. Preview the collection and download MP4/PNG originals for free. Includes 14 static wallpapers and 3 MP4 live wallpapers.', 'en', 'static'), true);
  assert.equal(isGeneratedDescription('Download 6 OPPO Find X9 Ultra wallpapers as original PNG files. Includes one 2160×4800 image and three square images.', 'en', 'static'), false);
  const live = 'Explore 3 OnePlus 16 live wallpapers. Play video previews and download the original MP4 files for free. Use a compatible device or wallpaper app to set a video as your home or lock screen background.';
  assert.equal(isGeneratedDescription(live, 'en', 'dynamic'), true);
  assert.equal(isGeneratedDescription(live + ' This exclusive red edition contains a special animation.', 'en', 'dynamic'), false);
  assert.equal(isGeneratedDescription('Browse Galaxy A17 wallpapers for your home or lock screen. The blue orb was designed by Jane Doe for this device. Preview the collection and download PNG originals for free.', 'en', 'static'), false);
});

test('scene updates preserve editorial descriptions, protect concurrent edits and roll back exactly', () => {
  const db = new DatabaseSync(':memory:');
  for (const file of readdirSync('migrations').filter(file => file.endsWith('.sql')).sort()) db.exec(readFileSync(`migrations/${file}`, 'utf8'));
  db.exec(`INSERT INTO w_devices(id,brand_name,device_name,device_slug,device_category,release_date,status,create_date,updated_date)
    VALUES('d','samsung','Galaxy A17','galaxy-a17','phone','2026/1','published',1,1);
    INSERT INTO w_wallpapers(id,device_id,name,mime_type,size_bytes,origin_key,file_format,media_type,category,tags,status,create_date,updated_date)
    VALUES('w','d','a','image/png',1,'a.png','png','static','phone','["gradient"]','published',1,1);
    INSERT INTO w_device_i18n(id,device_id,language,display_name,seo_title,description,create_date,updated_date)
    VALUES('en','d','en','Galaxy A17','Custom title','Browse Galaxy A17 wallpapers for your home or lock screen. Preview the collection and download PNG originals for free.',1,1),
    ('zh','d','zh','Galaxy A17','人工标题','这张图展现一片安静的湖泊。',1,1);`);
  const before = db.prepare('SELECT * FROM w_device_i18n ORDER BY id').all();
  const plan = buildScenePlan(db, 2000);
  const sql = sceneSql(plan);
  assert.equal(plan.changes.length, 4); // generic English + three missing languages
  db.exec(sql.apply);
  const after = db.prepare('SELECT * FROM w_device_i18n ORDER BY id').all();
  assert.equal(after.find(r => r.id === 'zh').description, '这张图展现一片安静的湖泊。');
  const en = after.find(r => r.id === 'en');
  assert.match(en.description, /gradient/);
  assert.match(en.description, /Android.*iPhone/);
  assert.equal(en.seo_title, 'Custom title');
  assert.doesNotMatch(en.description, /1 wallpaper|4K|1080/);
  db.exec(sql.apply);
  assert.deepEqual(db.prepare('SELECT * FROM w_device_i18n ORDER BY id').all(), after);
  db.exec(sql.rollback);
  assert.deepEqual(db.prepare('SELECT * FROM w_device_i18n ORDER BY id').all(), before);
  db.exec("UPDATE w_device_i18n SET description='Concurrent editorial change',updated_date=3000 WHERE id='en'");
  db.exec(sql.apply);
  assert.equal(db.prepare("SELECT description FROM w_device_i18n WHERE id='en'").get().description, 'Concurrent editorial change');
  db.close();
});
