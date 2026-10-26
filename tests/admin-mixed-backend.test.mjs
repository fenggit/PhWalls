import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { createTsLoader } from '../scripts/tests/load-ts.mjs';
function fixture(t, beforeBatch = () => {}, beforeRun = () => {}) {
 const sqlite = new DatabaseSync(':memory:'); t.after(() => sqlite.close());
 sqlite.exec('PRAGMA foreign_keys=ON');
 for (const name of readdirSync('migrations').filter(x=>x.endsWith('.sql')).sort()) sqlite.exec(readFileSync(`migrations/${name}`,'utf8'));
 sqlite.exec("INSERT INTO w_brands(slug,title,kind,create_date,updated_date) VALUES('test','Test','mobile',1,1); INSERT INTO w_devices(id,brand_name,device_name,device_slug,device_category,create_date,updated_date) VALUES('device','test','Device','device','phone',1,1)");
 const db={prepare(sql){let values=[];return {bind(...v){values=v;return this},async first(){return sqlite.prepare(sql).get(...values)||null},async all(){return {results:sqlite.prepare(sql).all(...values)}},async run(){beforeRun(sql,sqlite);return {meta:sqlite.prepare(sql).run(...values)}}}},async batch(statements){beforeBatch(sqlite);sqlite.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}}};
 const load=createTsLoader({'@/lib/wallpaper-db':{getWallpaperDb:()=>db},'@/lib/r2-upload':{headR2Object:async()=>({size:100,mimeType:'image/webp'})}});
 const admin=load('src/lib/admin-data.ts');
 const add=(name,patch={})=>admin.createAdminWallpaper({device_id:'device',name,origin_key:`test/Device/origin/${name}.webp`,compress_key:`test/Device/compress/${name}.webp`,mime_type:'image/webp',size_bytes:100,...patch});
 return {sqlite,load,admin,add};
}
test('static and MP4 use the same device target, preferring a stored prefix',()=>{
 const load=createTsLoader();const p=load('src/lib/admin-upload-path.ts');const d={device_category:'phone',brand_name:'test',device_name:'Device',device_slug:'device'};
 assert.equal(p.getAdminUploadDirectories(d,'dynamic',[]).prefix,'test/Device');
 assert.equal(p.getAdminUploadDirectories({...d,upload_prefix:'test/Pinned'},'static',[]).prefix,'test/Pinned');
 assert.throws(()=>p.assertAdminUploadMime('video/webm','origin','dynamic'));
});
test('Surface foldables use the desktop brand namespace and only disclose misplaced history',()=>{
 const p=createTsLoader()('src/lib/admin-upload-path.ts');
 const device={device_category:'phone_fold',brand_name:'microsoft-surface',device_name:'Surface Duo 2',device_slug:'surface-duo-2'};
 const files=[{media_type:'static',origin_key:'microsoft-surface/Surface Duo 2/origin/a.jpg'}];
 const storage=p.getAdminUploadDirectories(device,'dynamic',files);
 assert.equal(storage.prefix,'desktopwalls/microsoft-surface/Surface Duo 2');
 assert.deepEqual(storage.directories,[]);
 assert.deepEqual(storage.historical_directories,['microsoft-surface/Surface Duo 2']);
 assert.equal(p.deviceR2Prefix(device),'desktopwalls/microsoft-surface/surface-duo-2');
 assert.equal(device.device_category,'phone_fold');
 assert.throws(()=>p.getAdminUploadDirectories({...device,upload_prefix:'microsoft-surface/Surface Duo 2'},'static',[]),/desktopwalls\/microsoft-surface/);
});
test('shared mobile and desktop brands choose storage by device category',()=>{
 const p=createTsLoader({'@/data/desktopwalls/tab.json':[
  {title:'Huawei',type:'huawei'},{title:'Microsoft Surface',type:'microsoft-surface'},
 ]})('src/lib/admin-upload-path.ts');
 const phone={device_category:'phone',brand_name:'huawei',device_name:'Huawei Mate 80',device_slug:'huawei-mate-80'};
 assert.equal(p.getAdminUploadDirectories(phone,'static',[]).prefix,'huawei/Huawei Mate 80');
 assert.equal(p.getAdminUploadDirectories(phone,'dynamic',[{media_type:'static',origin_key:'huawei/Huawei Mate 80/origin/a.jpg'}]).prefix,'huawei/Huawei Mate 80');
 assert.doesNotThrow(()=>p.assertAdminUploadPrefixNamespace(phone,'huawei/Huawei Mate 80'));
 assert.equal(p.deviceR2Prefix({...phone,device_category:'desktop'}),'desktopwalls/huawei/huawei-mate-80');
 assert.throws(()=>p.assertAdminUploadPrefixNamespace({...phone,device_category:'desktop'},'huawei/Huawei Mate 80'),/desktopwalls\/huawei/);
 assert.equal(p.deviceR2Prefix({...phone,brand_name:'microsoft-surface',device_category:'phone_fold'}),'desktopwalls/microsoft-surface/huawei-mate-80');
});
test('Surface explicit uploads and device directory edits reject a different brand namespace',async t=>{
 const f=fixture(t);
 f.sqlite.exec("INSERT INTO w_brands(slug,title,kind,create_date,updated_date) VALUES('microsoft-surface','Microsoft Surface','desktop',1,1); UPDATE w_devices SET brand_name='microsoft-surface',device_name='Surface Duo 2',device_category='phone_fold'");
 const device=f.sqlite.prepare('SELECT * FROM w_devices').get();
 const storage=f.load('src/lib/admin-upload-storage.ts');
 for(const prefix of ['microsoft-surface/Surface Duo 2','desktopwalls/microsoft-windows/Surface Duo 2','desktopwalls/Microsoft Surface/Surface Duo 2']) {
  await assert.rejects(()=>storage.resolveAdminUploadStorage(device,'static',{r2_prefix:prefix,path_mode:'custom'}),/desktopwalls\/microsoft-surface/);
  await assert.rejects(()=>f.admin.updateAdminDevice({id:'device',upload_prefix:prefix,expected_updated_date:1}),/desktopwalls\/microsoft-surface/);
 }
 assert.equal(f.sqlite.prepare('SELECT upload_prefix FROM w_devices').get().upload_prefix,null);
 const target='desktopwalls/microsoft-surface/Surface Duo 2';
 assert.equal(await storage.resolveAdminUploadStorage(device,'dynamic',{r2_prefix:target,path_mode:'custom'}),target);
 assert.equal(f.sqlite.prepare('SELECT device_category FROM w_devices').get().device_category,'phone_fold');
});
test('actual signatures distinguish MP4, AVIF and forged image content',()=>{
 const p=createTsLoader({'@/lib/r2-upload':{}})('src/lib/admin-upload-content.ts');
 const mp4=Uint8Array.from([0,0,0,24,...Buffer.from('ftypisom'),0,0,0,0,...Buffer.from('isommp42')]);
 p.assertAdminUploadContent(mp4,'video/mp4');
 assert.throws(()=>p.assertAdminUploadContent(mp4,'image/avif'));
 assert.throws(()=>p.assertAdminUploadContent(Uint8Array.from([1,2,3,4]),'image/webp'));
});
test('scoped publish leaves old drafts and the other media untouched',async t=>{
 const f=fixture(t);const current=await f.add('current');await f.add('old');await f.add('movie',{media_type:'dynamic',origin_key:'test/Device/origin/movie.mp4',mime_type:'video/mp4'});
 const svc=f.load('src/lib/admin-collections.ts');const check=await svc.checkAdminCollection('device',{wallpaper_ids:[current.id]});
 await svc.publishAdminCollection({device_id:'device',wallpaper_ids:[current.id],snapshot:check.snapshot,make_device_visible:true});
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM w_wallpapers WHERE status=\'published\'').get().n,1);
});
test('publication requires a primary in each category/media and acknowledgement of other-media visibility',async t=>{
 const f=fixture(t);const still=await f.add('still');const movie=await f.add('movie',{media_type:'dynamic',origin_key:'test/Device/origin/movie.mp4',mime_type:'video/mp4'});
 f.sqlite.prepare("UPDATE w_wallpapers SET status='published' WHERE id=?").run(movie.id);
 const svc=f.load('src/lib/admin-collections.ts');let check=await svc.checkAdminCollection('device',{wallpaper_ids:[still.id]});
 assert.equal(check.requires_visibility_acknowledgement,true);
 await assert.rejects(()=>svc.publishAdminCollection({device_id:'device',wallpaper_ids:[still.id],snapshot:check.snapshot,make_device_visible:true}),/确认/);
 f.sqlite.exec('UPDATE w_wallpapers SET is_primary=0 WHERE media_type=\'static\'');
 check=await svc.checkAdminCollection('device',{wallpaper_ids:[still.id]});
 await assert.rejects(()=>svc.publishAdminCollection({device_id:'device',wallpaper_ids:[still.id],snapshot:check.snapshot,make_device_visible:true,acknowledge_other_media_visibility:true}),/主/);
});
test('snapshot is rechecked within the write transaction and scoped unpublish preserves drafts',async t=>{
 let mutate=false;const f=fixture(t,db=>{if(mutate){mutate=false;db.exec("UPDATE w_wallpapers SET tags='[\"changed\"]'")}});const still=await f.add('still');await f.add('old');
 const svc=f.load('src/lib/admin-collections.ts');let check=await svc.checkAdminCollection('device',{wallpaper_ids:[still.id]});mutate=true;
 await assert.rejects(()=>svc.publishAdminCollection({device_id:'device',wallpaper_ids:[still.id],snapshot:check.snapshot,make_device_visible:true}),/变更/);
 assert.equal(f.sqlite.prepare("SELECT count(*) n FROM w_wallpapers WHERE status='published'").get().n,0);
 check=await svc.checkAdminCollection('device',{wallpaper_ids:[still.id]});await svc.publishAdminCollection({device_id:'device',wallpaper_ids:[still.id],snapshot:check.snapshot,make_device_visible:true});
 check=await svc.checkAdminCollection('device',{media_type:'static',operation:'unpublish'});await svc.unpublishAdminCollection({device_id:'device',media_type:'static',snapshot:check.snapshot});
 assert.equal(f.sqlite.prepare("SELECT status FROM w_wallpapers WHERE name='old'").get().status,'draft');
 assert.equal(f.sqlite.prepare("SELECT status FROM w_wallpapers WHERE name='still'").get().status,'unpublished');
});
test('stable upload IDs replay once and cannot adopt an unrelated original',async t=>{
 const f=fixture(t);const input={device_id:'device',name:'once',origin_key:'test/Device/origin/once.webp',compress_key:'test/Device/compress/once.webp',mime_type:'image/webp',size_bytes:100};
 const first=await f.admin.createAdminWallpaper(input,'upload-stable');
 const again=await f.admin.createAdminWallpaper(input,'upload-stable');assert.equal(first.id,again.id);
 assert.equal(f.sqlite.prepare('SELECT count(*) n FROM w_wallpapers').get().n,1);
 await assert.rejects(()=>f.admin.createAdminWallpaper({...input,name:'stolen'},'upload-other'));
 await assert.rejects(()=>f.admin.createAdminWallpaper({...input,name:'changed'},'upload-stable'));
});
test('upload grants bind group, media and role and reject unsigned or expired data',async()=>{
 const env={ADMIN_SESSION_SECRET:'fixture-session-secret-that-is-at-least-32-characters'};
 const svc=createTsLoader({'@cloudflare/next-on-pages':{getOptionalRequestContext:()=>({env})}})('src/lib/r2-upload.ts');
 const binding={deviceId:'device',groupId:'group',media:'dynamic',role:'origin',prefix:'test/Device'};
 const token=await svc.createUploadGrant('test/Device/origin/a.mp4',100,'video/mp4',binding);
 const grant=await svc.verifyUploadGrant(token);assert.equal(grant.groupId,'group');assert.equal(grant.media,'dynamic');assert.equal(grant.role,'origin');
 await assert.rejects(()=>svc.verifyUploadGrant(token.replace(/.$/,'z')));
 const old=Date.now;Date.now=()=>old()+16*60*1000;
 try {await assert.rejects(()=>svc.verifyUploadGrant(token),/过期/)} finally {Date.now=old}
});
test('directory edits reject another device history and stale device versions',async t=>{
 const f=fixture(t);f.sqlite.exec("INSERT INTO w_devices(id,brand_name,device_name,device_slug,device_category,create_date,updated_date) VALUES('other','test','Other','other','phone',1,1)");
 await f.add('still');
 await assert.rejects(()=>f.admin.updateAdminDevice({id:'other',upload_prefix:'test/Device',expected_updated_date:1}),/其他设备/);
 await assert.rejects(()=>f.admin.updateAdminDevice({id:'device',upload_prefix:'test/New',expected_updated_date:0}),/变更/);
 const row=await f.admin.updateAdminDevice({id:'device',upload_prefix:'test/New',expected_updated_date:1});assert.equal(row.upload_prefix,'test/New');
});
test('legacy device-wide draft publication requires an explicit selection',async t=>{
 const f=fixture(t);await f.add('draft');
 await assert.rejects(()=>f.admin.updateAdminDevice({id:'device',status:'published',publish_drafts:true}),/选择/);
 assert.equal(f.sqlite.prepare('SELECT status FROM w_wallpapers').get().status,'draft');
});
test('device list summarizes publication states separately for each media',async t=>{
 const f=fixture(t);const still=await f.add('still');await f.add('more');await f.add('movie',{media_type:'dynamic',origin_key:'test/Device/origin/movie.mp4',mime_type:'video/mp4'});
 f.sqlite.prepare("UPDATE w_wallpapers SET status='published' WHERE id=?").run(still.id);
 const [device]=await f.admin.listAdminDevices(new URLSearchParams());
 assert.equal(device.static_published_count,1);assert.equal(device.static_draft_count,1);assert.equal(device.dynamic_published_count,0);assert.equal(device.dynamic_draft_count,1);
});

test('concurrent complete replays return the winner when the conditional insert observes its keys',async t=>{
 let inject=true;
 const f=fixture(t,()=>{},(sql,db)=>{
  if (!inject || !sql.includes('INSERT INTO w_wallpapers')) return; inject=false;
  db.exec("INSERT INTO w_wallpapers(id,device_id,name,mime_type,size_bytes,origin_key,compress_key,file_format,media_type,category,is_primary,tags,status,create_date,updated_date) VALUES('upload-race','device','once','image/webp',100,'test/Device/origin/once.webp','test/Device/compress/once.webp','webp','static','phone',1,'[]','draft',1,1)");
 });
 const row=await f.admin.createAdminWallpaper({device_id:'device',name:'once',origin_key:'test/Device/origin/once.webp',compress_key:'test/Device/compress/once.webp',mime_type:'image/webp',size_bytes:100},'upload-race');
 assert.equal(row.id,'upload-race');assert.equal(f.sqlite.prepare('SELECT count(*) n FROM w_wallpapers').get().n,1);
});
test('single-record edits cannot bypass the scoped publication snapshot',async t=>{
 const f=fixture(t);const row=await f.add('draft');
 await assert.rejects(()=>f.admin.updateAdminWallpaper({id:row.id,status:'published'}),/合集发布/);
 assert.equal(f.sqlite.prepare('SELECT status FROM w_wallpapers').get().status,'draft');
});
test('retired derived video previews reject dynamic record creation and media changes but preserve static rows',async t=>{
 const f=fixture(t);
 f.sqlite.exec("INSERT INTO w_deleted_wallpaper_files(object_key,deleted_at) VALUES('test/Device/preview/retired.mp4',1)");
 await assert.rejects(()=>f.add('retired',{media_type:'dynamic',mime_type:'video/mp4',origin_key:'test/Device/origin/retired.mp4'}),/deleted|删除/);
 const still=await f.add('still');
 f.sqlite.exec("INSERT INTO w_deleted_wallpaper_files(object_key,deleted_at) VALUES('test/Device/preview/still.webp',1)");
 f.sqlite.prepare("UPDATE w_wallpapers SET name='unchanged-static' WHERE id=?").run(still.id);
 assert.throws(()=>f.sqlite.prepare("UPDATE w_wallpapers SET media_type='dynamic' WHERE id=?").run(still.id),/deleted/);
 assert.equal(f.sqlite.prepare('SELECT media_type FROM w_wallpapers WHERE id=?').get(still.id).media_type,'static');
});
