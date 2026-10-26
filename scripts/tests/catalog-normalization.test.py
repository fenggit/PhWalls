import importlib.util
from pathlib import Path
import tempfile, unittest
spec=importlib.util.spec_from_file_location('catalog', Path(__file__).parents[1]/'catalog-normalization.py')
catalog=importlib.util.module_from_spec(spec);spec.loader.exec_module(catalog)
class CatalogTests(unittest.TestCase):
 def test_shared_brand_registry_preserves_phone_paths_and_desktop_categories(self):
  import json, sqlite3
  from unittest.mock import patch
  original_read=Path.read_text
  def read_registry(path,*args,**kwargs):
   if path==Path(catalog.__file__).resolve().parents[1]/'src/data/desktopwalls/tab.json':
    return json.dumps([{'title':'Huawei','type':'huawei'},{'title':'Microsoft Surface','type':'microsoft-surface'}])
   return original_read(path,*args,**kwargs)
  shared=importlib.util.module_from_spec(spec)
  with patch.object(Path,'read_text',read_registry):spec.loader.exec_module(shared)
  self.assertEqual(shared.normalize_path('huawei/Huawei Mate 80/origin/A.JPG'),'huawei/Huawei Mate 80/origin/a.jpg')
  self.assertEqual(shared.normalize_path('Live/Huawei/Huawei Mate 80/origin/A.MP4'),'huawei/Huawei Mate 80/origin/a.mp4')
  self.assertEqual(shared.normalize_path('desktopwalls/Huawei/Huawei MateBook/origin/A.JPG'),'desktopwalls/huawei/Huawei MateBook/origin/a.jpg')
  self.assertEqual(shared.normalize_path('microsoft-surface/Surface Duo/origin/A.JPG'),'desktopwalls/microsoft-surface/Surface Duo/origin/a.jpg')
  db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
  try:
   db.executescript("CREATE TABLE w_devices(id TEXT,brand_name TEXT,device_name TEXT,device_slug TEXT,device_category TEXT,create_date INTEGER); INSERT INTO w_devices VALUES('phone','huawei','Huawei Mate 80','mate-80','phone',1),('desktop','huawei','Huawei MateBook','matebook','desktop',1); CREATE TABLE w_wallpapers(device_id TEXT,origin_key TEXT,compress_key TEXT); INSERT INTO w_wallpapers VALUES('phone','huawei/Huawei Mate 80/origin/a.jpg',NULL),('desktop','huawei/Huawei MateBook/origin/a.jpg',NULL)")
   shared.configure_prefixes(db)
   self.assertEqual(shared.normalize_path('huawei/Huawei Mate 80/origin/a.jpg'),'huawei/Huawei Mate 80/origin/a.jpg')
   self.assertEqual(shared.normalize_path('huawei/Huawei MateBook/origin/a.jpg'),'desktopwalls/huawei/Huawei MateBook/origin/a.jpg')
  finally:db.close()
 def test_unindexed_desktop_brands_use_the_registry_slug(self):
  saved=dict(catalog.PREFIX_OVERRIDES);catalog.PREFIX_OVERRIDES.clear()
  try:
   for source in ['desktopwalls/Microsoft Surface/Surface Duo 2/origin/A.JPG','microsoft-surface/Surface Duo 2/origin/A.JPG']:
    self.assertEqual(catalog.normalize_path(source),'desktopwalls/microsoft-surface/Surface Duo 2/origin/a.jpg')
   self.assertEqual(catalog.normalize_path('Live/Microsoft Surface/Surface Duo 2/origin/A.MP4'),'desktopwalls/microsoft-surface/Surface Duo 2/origin/a.mp4')
   self.assertEqual(catalog.normalize_path('desktopwalls/Windows/Windows 11/compress/A.WEBP'),'desktopwalls/microsoft-windows/Windows 11/compress/a.webp')
   self.assertEqual(catalog.normalize_path('desktopwalls/Unknown Vendor/Model/origin/A.JPG'),'desktopwalls/Unknown Vendor/Model/origin/a.jpg')
   self.assertEqual(catalog.normalize_path('macOS/Sonoma/origin/A.JPG'),'macos/Sonoma/origin/a.jpg')
  finally:catalog.PREFIX_OVERRIDES.clear();catalog.PREFIX_OVERRIDES.update(saved)
 def test_surface_storage_does_not_change_foldable_form_factor(self):
  import sqlite3
  saved=dict(catalog.PREFIX_OVERRIDES)
  db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
  try:
   db.executescript("CREATE TABLE w_devices(id TEXT,brand_name TEXT,device_name TEXT,device_slug TEXT,device_category TEXT,create_date INTEGER); INSERT INTO w_devices VALUES('surface','microsoft-surface','Surface Duo 2','surface-duo-2','phone_fold',1); CREATE TABLE w_wallpapers(device_id TEXT,origin_key TEXT,compress_key TEXT); INSERT INTO w_wallpapers VALUES('surface','microsoft-surface/Surface Duo 2/origin/a.jpg',NULL)")
   catalog.configure_prefixes(db)
   self.assertEqual(catalog.normalize_path('microsoft-surface/Surface Duo 2/origin/a.jpg'),'desktopwalls/microsoft-surface/Surface Duo 2/origin/a.jpg')
   self.assertEqual(db.execute('SELECT device_category FROM w_devices').fetchone()[0],'phone_fold')
  finally:db.close();catalog.PREFIX_OVERRIDES.clear();catalog.PREFIX_OVERRIDES.update(saved)
 def test_unindexed_live_inputs_use_the_same_model_directory(self):
  saved=dict(catalog.PREFIX_OVERRIDES);catalog.PREFIX_OVERRIDES.clear()
  try:
   self.assertEqual(catalog.normalize_path('Live/OnePlus/Oneplus 16/origin/oneplus-16-pokemon-1.mp4'),'oneplus/OnePlus 16/origin/oneplus-16-pokemon-1.mp4')
   self.assertEqual(catalog.normalize_path('Live/Samsung/Samsung Galaxy A22/compress/a.webp'),'samsung/Samsung Galaxy A22/compress/a.webp')
   self.assertEqual(catalog.normalize_path('live/Google/Google Pixel 12/origin/a.mp4'),'google-pixel/Google Pixel 12/origin/a.mp4')
   with self.assertRaisesRegex(ValueError,'Live'):
    catalog.normalize_path('Live/Unrecognized Vendor/Model/origin/a.mp4')
  finally:catalog.PREFIX_OVERRIDES.clear();catalog.PREFIX_OVERRIDES.update(saved)
 def test_examples_and_meaningful_qualifiers(self):
  self.assertEqual(catalog.normalize_label('Huawei Mate 80 (Pro)'), 'Huawei Mate 80 Pro')
  self.assertEqual(catalog.normalize_label('Huawei Mate 70 Pro(+)'), 'Huawei Mate 70 Pro')
  self.assertEqual(catalog.normalize_label('Vivo X80 (Pro)'), 'vivo X80 Pro')
  self.assertEqual(catalog.normalize_label('Oppo Find X5 (Pro)'), 'OPPO Find X5 Pro')
  self.assertEqual(catalog.normalize_label('Realme 16 Pro(+)'), 'realme 16 Pro Plus')
  self.assertNotEqual(catalog.normalize_label('Android 4.4 (KitKat)'), catalog.normalize_label('Android 4.4'))
 def test_filename_preserves_distinct_plus_and_media_role(self):
  self.assertEqual(catalog.normalize_filename('BLUE__Moon+.JPG'), 'blue-moon-plus.jpg')
  self.assertEqual(catalog.normalize_filename('flower-dark-fold.webp'), 'flower-dark-fold.webp')
 def test_local_duplicate_quarantine_retains_unique_content(self):
  rows=[{'path':'A.JPG','sha256':'a'*64,'size':3,'md5':'x'}, {'path':'a.jpg','sha256':'b'*64,'size':3,'md5':'y'}]
  moves,issues=catalog.local_plan(rows)
  self.assertEqual(len(issues),0)
  self.assertEqual(len(set(x['target'] for x in moves)),1)
  self.assertTrue(any('-alt-' in x['target'] for x in moves))
 def test_dedup_only_same_collection_and_role(self):
  rows=[{'path':'huawei/Huawei Mate 70 Pro/origin/a.jpg','sha256':'a'*64,'size':3,'md5':'x'}, {'path':'huawei/Huawei Mate 70 Pro(+)/origin/b.jpg','sha256':'a'*64,'size':3,'md5':'x'}, {'path':'huawei/Huawei Mate 70 Pro/compress/a.webp','sha256':'a'*64,'size':3,'md5':'x'}]
  moves,issues=catalog.local_plan(rows)
  self.assertEqual(sum(x['action']=='quarantine-duplicate' for x in moves),1)
  self.assertEqual(sum(x['action']=='move' for x in moves),0) # canonical originals and compress are unchanged
  self.assertEqual(issues,[])
 def test_local_apply_rollback_keeps_independent_verified_copy(self):
  from types import SimpleNamespace
  import json
  with tempfile.TemporaryDirectory() as d:
   root=Path(d)/'source';root.mkdir();source=root/'a__b.JPG';source.write_bytes(b'preserve-unique-image')
   row=catalog.inventory_file(root,source);actions,_=catalog.local_plan([row])
   manifest=Path(d)/'manifest.json';manifest.write_text(json.dumps({'source':str(root),'local_actions':actions}))
   args=SimpleNamespace(manifest=str(manifest),quarantine=str(Path(d)/'quarantine'))
   catalog.local_apply(args)
   target=root/actions[0]['target'];backup=Path(args.quarantine)/row['path']
   self.assertEqual(target.read_bytes(),backup.read_bytes())
   self.assertNotEqual(target.stat().st_ino,backup.stat().st_ino)
   catalog.local_rollback(args)
   self.assertEqual(source.read_bytes(),b'preserve-unique-image')
 def test_editorial_preserves_translated_brand_and_authored_intro(self):
  self.assertEqual(catalog.normalize_editorial('原创：华为 Mate 80 (Pro) 的蓝色壁纸','Huawei Mate 80 (Pro)','Huawei Mate 80 Pro'),'原创：华为 Mate 80 Pro 的蓝色壁纸')
 def test_remote_duplicate_preserves_publication_primary_tags_and_editorial(self):
  import sqlite3,json
  db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row
  ds=[{'id':'a','brand_name':'huawei','device_name':'Huawei Enjoy 10 (Plus)','device_slug':'huawei-enjoy-10-plus','device_category':'phone','status':'draft','create_date':1,'updated_date':1,'name_key':'huawei enjoy 10 (plus)'},{'id':'b','brand_name':'huawei','device_name':'Huawei Enjoy 10 Plus','device_slug':'huawei-enjoy-10-plus-2','device_category':'phone','status':'published','create_date':2,'updated_date':1,'name_key':'huawei enjoy 10 plus'}]
  ws=[{'id':'w'+d['id'],'device_id':d['id'],'origin_key':'huawei/'+d['device_name']+'/origin/a.jpg','compress_key':None,'mime_type':'image/jpeg','file_format':'jpg','name':'a','media_type':'static','category':'phone','status':d['status'],'is_primary':int(d['id']=='b'),'create_date':1,'updated_date':1,'tags':json.dumps([d['id']])} for d in ds]
  texts=[{'id':'t'+d['id'],'device_id':d['id'],'language':'en','display_name':d['device_name'],'seo_title':'' if d['id']=='a' else 'Authored title','description':'Original '+d['id'],'create_date':1,'updated_date':1} for d in ds]
  for table,rows in [('w_devices',ds),('w_wallpapers',ws),('w_device_i18n',texts),('w_live_device_i18n',[])]:
   template=rows[0] if rows else texts[0]
   db.execute('CREATE TABLE '+table+' ('+','.join(k+' '+('INTEGER' if isinstance(v,int) else 'TEXT') for k,v in template.items())+')')
   for row in rows:db.execute('INSERT INTO '+table+' VALUES ('+','.join('?' for _ in row)+')',list(row.values()))
  inventory=[{'path':w['origin_key'],'sha256':'a'*64,'md5':'b'*32,'size':1} for w in ws]
  changes,_,_=catalog.remote_plan(db,inventory,[])
  winner=next(c['after'] for c in changes if c['table']=='w_wallpapers' and c['after'])
  self.assertEqual(winner['status'],'published');self.assertEqual(winner['is_primary'],1)
  self.assertEqual(set(json.loads(winner['tags'])),{'a','b'})
  text=next(c['after'] for c in changes if c['table']=='w_device_i18n' and c['after'] and c['after']['id']=='ta')
  self.assertEqual(text['seo_title'],'Authored title');self.assertEqual(text['description'],'Original a')
  loser=next(c for c in changes if c['table']=='w_device_i18n' and c['after'] is None)
  self.assertIn('description',loser['editorial_conflicts'])
 def test_real_format_correction_keeps_jpeg_synonym(self):
  catalog.FORMAT_OVERRIDES['honor/Honor Magic 8 Pro/origin/blue.jpg']='.png'
  self.assertEqual(catalog.normalize_path('honor/Honor Magic 8 Pro/origin/blue.jpg'),'honor/Honor Magic 8 Pro/origin/blue.png')
  catalog.FORMAT_OVERRIDES['huawei/Test/origin/a.jpeg']='.jpg'
  self.assertEqual(catalog.normalize_path('huawei/Test/origin/a.jpeg'),'huawei/Test/origin/a.jpeg')
  catalog.FORMAT_OVERRIDES.clear()
 def test_distinct_originals_keep_byte_identical_covers(self):
  rows=[{'path':'huawei/Test/origin/a.jpg','sha256':'a'*64,'md5':'x','size':1},{'path':'huawei/Test/origin/b.jpg','sha256':'b'*64,'md5':'y','size':1},{'path':'huawei/Test/compress/a.webp','sha256':'c'*64,'md5':'z','size':1},{'path':'huawei/Test/compress/b.webp','sha256':'c'*64,'md5':'z','size':1}]
  moves,_=catalog.local_plan(rows)
  self.assertFalse(any(x['action']=='quarantine-duplicate' for x in moves))
  self.assertEqual(len(catalog.PAIR_STATE['report']['cover_pairings']),2)
 def test_extension_collision_uses_the_originals_exact_cover(self):
  rows=[{'path':'nokia/Nokia 6.2/origin/blue.jpg','sha256':'a'*64,'md5':'x','size':1},{'path':'nokia/Nokia 6.2/origin/blue.png','sha256':'b'*64,'md5':'y','size':1},{'path':'nokia/Nokia 6.2/compress/blue-src-jpg.webp','sha256':'c'*64,'md5':'z','size':1},{'path':'nokia/Nokia 6.2/compress/blue-src-png.webp','sha256':'d'*64,'md5':'w','size':1}]
  catalog.local_plan(rows);pairs=catalog.PAIR_STATE['pairs']
  self.assertTrue(pairs[rows[0]['path']]['origin_target'].endswith('blue-src-jpg.jpg'))
  self.assertTrue(pairs[rows[1]['path']]['cover_target'].endswith('blue-src-png.webp'))
  self.assertEqual(pairs[rows[0]['path']]['cover']['sha256'],'c'*64)
 def test_image_video_same_stem_and_fold_qualifiers(self):
  rows=[{'path':'samsung/Galaxy Fold/origin/blue-dark.jpg','sha256':'a'*64,'md5':'x','size':1},{'path':'samsung/Galaxy Fold/origin/blue-dark.mp4','sha256':'b'*64,'md5':'y','size':1},{'path':'samsung/Galaxy Fold/compress/blue-dark-src-jpg.webp','sha256':'c'*64,'md5':'z','size':1},{'path':'samsung/Galaxy Fold/compress/blue-dark-src-mp4.webp','sha256':'d'*64,'md5':'w','size':1}]
  catalog.local_plan(rows);pairs=catalog.PAIR_STATE['pairs']
  self.assertTrue(pairs[rows[0]['path']]['origin_target'].endswith('blue-src-jpg-dark-fold.jpg'))
  self.assertTrue(pairs[rows[1]['path']]['cover_target'].endswith('blue-src-mp4-dark-fold.webp'))
 def test_apfs_case_only_parent_renames_and_rollback_preserve_notes(self):
  from types import SimpleNamespace
  import json,os
  with tempfile.TemporaryDirectory() as d:
   root=Path(d)/'source';folder=root/'Nokia'/'NOKIA Pura 70'/'origin';folder.mkdir(parents=True)
   if not (root/'nokia').exists() or not os.path.samefile(root/'Nokia',root/'nokia'):self.skipTest('Requires a case-insensitive filesystem')
   original=folder/'A.JPG';original.write_bytes(b'case-specific-original');(folder.parent/'notes.md').write_text('preserve authored notes')
   row=catalog.inventory_file(root,original);action={**row,'target':'nokia/Nokia Pura 70/origin/a.jpg','action':'move'}
   manifest=Path(d)/'manifest.json';manifest.write_text(json.dumps({'source':str(root),'local_actions':[action]}));args=SimpleNamespace(manifest=str(manifest),quarantine=str(Path(d)/'quarantine'))
   catalog.local_apply(args)
   self.assertIn('nokia',[p.name for p in root.iterdir()]);self.assertNotIn('Nokia',[p.name for p in root.iterdir()])
   self.assertIn('Nokia Pura 70',[p.name for p in (root/'nokia').iterdir()]);self.assertEqual((root/'nokia/Nokia Pura 70/notes.md').read_text(),'preserve authored notes')
   catalog.local_rollback(args)
   self.assertIn('Nokia',[p.name for p in root.iterdir()]);self.assertIn('NOKIA Pura 70',[p.name for p in (root/'Nokia').iterdir()]);self.assertEqual(original.read_bytes(),b'case-specific-original')
 def test_matepad_directory_and_metadata_are_quarantined_and_restored(self):
  from types import SimpleNamespace
  import json
  with tempfile.TemporaryDirectory() as d:
   root=Path(d)/'source';folder=root/'huawei matepad'/'Model'/'origin';folder.mkdir(parents=True);original=folder/'a.jpg';original.write_bytes(b'matepad')
   (folder/'._a.jpg').write_bytes(b'finder');(root/'huawei matepad'/'notes.md').write_text('preserve source note');(root/'huawei matepad'/'.DS_Store').write_bytes(b'metadata');(root/'._huawei matepad').write_bytes(b'brand-sidecar')
   row=catalog.inventory_file(root,original);action={**row,'target':None,'action':'quarantine-matepad'}
   manifest=Path(d)/'manifest.json';manifest.write_text(json.dumps({'source':str(root),'local_actions':[action]}));args=SimpleNamespace(manifest=str(manifest),quarantine=str(Path(d)/'quarantine'))
   catalog.local_apply(args);self.assertFalse((root/'huawei matepad').exists());self.assertFalse((root/'._huawei matepad').exists())
   catalog.local_rollback(args);self.assertEqual(original.read_bytes(),b'matepad');self.assertEqual((folder/'._a.jpg').read_bytes(),b'finder');self.assertEqual((root/'huawei matepad'/'notes.md').read_text(),'preserve source note');self.assertEqual((root/'._huawei matepad').read_bytes(),b'brand-sidecar')
 def test_interrupted_case_rename_rolls_back_through_journal(self):
  from types import SimpleNamespace
  from unittest.mock import patch
  import json,os
  with tempfile.TemporaryDirectory() as d:
   root=Path(d)/'source';folder=root/'Nokia';folder.mkdir(parents=True)
   if not (root/'nokia').exists():self.skipTest('Requires a case-insensitive filesystem')
   original=folder/'A.JPG';original.write_bytes(b'crash-recoverable');row=catalog.inventory_file(root,original)
   manifest=Path(d)/'manifest.json';manifest.write_text(json.dumps({'source':str(root),'local_actions':[{**row,'target':'nokia/a.jpg','action':'move'}]}));args=SimpleNamespace(manifest=str(manifest),quarantine=str(Path(d)/'quarantine'))
   rename=os.rename;calls=[]
   def interrupted(a,b):
    calls.append((a,b))
    if len(calls)==2:raise OSError('simulated interruption between case renames')
    return rename(a,b)
   with patch.object(catalog.os,'rename',side_effect=interrupted):
    with self.assertRaises(OSError):catalog.local_apply(args)
   catalog.local_rollback(args)
   self.assertIn('Nokia',[p.name for p in root.iterdir()]);self.assertEqual(original.read_bytes(),b'crash-recoverable')
 def test_authoritative_cover_mirror_preserves_old_source_and_rolls_back(self):
  from types import SimpleNamespace
  import json,hashlib
  with tempfile.TemporaryDirectory() as d:
   root=Path(d)/'source';folder=root/'Live'/'Brand'/'Model'/'compress';folder.mkdir(parents=True);original=folder/'a.webp';original.write_bytes(b'old local cover')
   row=catalog.inventory_file(root,original);target='brand/Model/compress/a.webp';source='live/Brand/Model/compress/a.webp'
   manifest=Path(d)/'manifest.json';manifest.write_text(json.dumps({'source':str(root),'local_actions':[{**row,'target':target,'action':'move'}],'r2_objects':[{'source':source,'target':target,'role':'compress_key','local':row}]}))
   args=SimpleNamespace(manifest=str(manifest),quarantine=str(Path(d)/'quarantine'));catalog.local_apply(args)
   improved=b'RIFF'+(12).to_bytes(4,'little')+b'WEBPVP8 '+b'\0\0\0\0';staged=Path(d)/'improved.webp';staged.write_bytes(improved)
   overlay=Path(d)/'overlay.json';overlay.write_text(json.dumps({'manifest_sha256':catalog.digest(manifest),'errors':[],'entries':[{'source':source,'target':target,'role':'compress_key','local':{'absolute_path':str(staged),'sha256':catalog.digest(staged)}}]}))
   catalog.mirror_cover_overlay(SimpleNamespace(manifest=str(manifest),quarantine=args.quarantine,overlay=str(overlay)))
   self.assertEqual((root/target).read_bytes(),improved);self.assertEqual((Path(args.quarantine)/row['path']).read_bytes(),b'old local cover')
   catalog.local_rollback(args);self.assertEqual(original.read_bytes(),b'old local cover')
if __name__=='__main__':unittest.main()
