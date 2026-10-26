import importlib.util, sqlite3, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('local_sync', ROOT/'scripts/catalog-local-db-sync.py')

class LocalSyncTests(unittest.TestCase):
 def setUp(self):
  self.module=importlib.util.module_from_spec(spec);spec.loader.exec_module(self.module)
  self.local=sqlite3.connect(':memory:');self.local.row_factory=sqlite3.Row
  for path in sorted((ROOT/'migrations').glob('*.sql')):self.local.executescript(path.read_text())
  self.local.executescript("INSERT INTO w_brands(slug,title,kind,create_date,updated_date) VALUES('huawei','Huawei','mobile',1,1),('huawei-matepad','MatePad','mobile',1,1),('private','Private','mobile',1,1);")
 def tearDown(self):self.local.close()
 def device(self,id,slug,name,brand='huawei',status='draft'):
  self.local.execute("INSERT INTO w_devices(id,brand_name,device_name,device_slug,device_category,status,create_date,updated_date) VALUES(?,?,?,?, 'phone',?,1,1)",(id,brand,name,slug,status))
 def asset(self,id,device,key,name,status='draft',primary=0,tags='[]'):
  self.local.execute("INSERT INTO w_wallpapers(id,device_id,name,mime_type,size_bytes,origin_key,compress_key,file_format,media_type,category,is_primary,tags,status,create_date,updated_date) VALUES(?,?,?,'image/jpeg',100,?,?,'jpg','static','phone',?,?,?,1,1)",(id,device,name,key,key.replace('/origin/','/compress/').replace('.jpg','.webp'),primary,tags,status))
 def test_different_ids_merge_confirmed_originals_preserves_local_text_and_unknown_assets(self):
  self.device('local-main','model','Huawei Model (Pro)');self.device('local-alt','model-2','Huawei Model Pro',status='published');self.device('local-private','private','My device','private')
  self.asset('local-a','local-main','huawei/Old/origin/a.jpg','authored-a',tags='["local"]')
  self.asset('local-b','local-alt','huawei/New/origin/b.jpg','b','published',1,'["other"]')
  self.asset('local-only','local-alt','private/Unique/origin/unique.jpg','unique')
  self.asset('untouched','local-private','private/Unknown/origin/unknown.jpg','authored-private')
  self.local.executescript("INSERT INTO w_device_i18n VALUES('text-main','local-main','en','Authored Huawei Model (Pro)','Custom SEO',NULL,1,1); INSERT INTO w_device_i18n VALUES('text-alt','local-alt','en','Alternative','Alternative SEO','My authored paragraph',1,1);")
  devices=[{'id':'remote-main','brand_name':'huawei','device_slug':'model','device_name':'Huawei Model (Pro)'},{'id':'remote-alt','brand_name':'huawei','device_slug':'model-2','device_name':'Huawei Model Pro'}]
  assets=[{'id':'remote-a','device_id':'remote-main','origin_key':'huawei/Old/origin/a.jpg','compress_key':'old-cover','name':'a','mime_type':'image/jpeg','file_format':'jpg','media_type':'static'},{'id':'remote-b','device_id':'remote-alt','origin_key':'huawei/New/origin/b.jpg','compress_key':'other-cover','name':'b','mime_type':'image/jpeg','file_format':'jpg','media_type':'static'}]
  after={**assets[0],'origin_key':'huawei/Normalized/origin/a.png','compress_key':'huawei/Normalized/compress/a.webp','name':'a','mime_type':'image/png','file_format':'png'}
  manifest={'d1_changes':[{'table':'w_devices','before':devices[0],'after':{**devices[0],'device_name':'Huawei Model Pro'},'reason':'normalize-display-name'},{'table':'w_devices','before':devices[1],'after':None,'reason':'merge-duplicate-device'},{'table':'w_wallpapers','before':assets[0],'after':after,'reason':'normalize-asset-name-key'},{'table':'w_wallpapers','before':assets[1],'after':None,'reason':'duplicate-original','winner_id':'remote-a'}],'aliases':[{'brand':'huawei','old_slug':'model-2','new_slug':'model','old_id':'remote-alt','new_id':'remote-main'}]}
  plan=self.module.build_plan(self.local,{'w_devices':devices,'w_wallpapers':assets},manifest)
  self.module.simulate(self.local,plan)
  self.module.execute_sql(self.local,self.module.build_sql(plan['changes']))
  rows={r['id']:dict(r)for r in self.local.execute('SELECT * FROM w_wallpapers')}
  self.assertNotIn('local-b',rows);self.assertEqual(rows['local-a']['status'],'published');self.assertEqual(rows['local-a']['is_primary'],1);self.assertEqual(rows['local-a']['tags'],'["local","other"]')
  self.assertEqual(rows['local-a']['name'],'authored-a');self.assertEqual(rows['local-a']['origin_key'],after['origin_key']);self.assertEqual(rows['local-only']['device_id'],'local-main');self.assertEqual(rows['untouched']['name'],'authored-private')
  text=dict(self.local.execute("SELECT * FROM w_device_i18n WHERE id='text-main'").fetchone())
  self.assertEqual(text['display_name'],'Authored Huawei Model Pro');self.assertEqual(text['seo_title'],'Custom SEO');self.assertEqual(text['description'],'My authored paragraph')
 def test_unchanged_remote_fields_do_not_overwrite_local_authored_asset_metadata(self):
  self.device('local','stable','Huawei Stable');self.asset('asset','local','huawei/Stable/origin/a.jpg','Custom local name','unpublished',0,'["private"]')
  remote_device={'id':'remote','brand_name':'huawei','device_slug':'stable','device_name':'Huawei Stable'}
  remote_asset={'id':'remote-asset','device_id':'remote','origin_key':'huawei/Stable/origin/a.jpg','compress_key':'remote-cover.webp','name':'remote-name','mime_type':'image/jpeg','file_format':'jpg','media_type':'static'}
  plan=self.module.build_plan(self.local,{'w_devices':[remote_device],'w_wallpapers':[remote_asset]},{'d1_changes':[],'aliases':[]})
  self.assertFalse(any(c['table']=='w_wallpapers'for c in plan['changes']))
  self.assertIn('huawei/Stable/origin/a.jpg',plan['surviving_object_keys'])
  self.module.simulate(self.local,plan)
 def test_shared_original_does_not_move_an_unrelated_local_device_or_coalesce_its_record(self):
  self.device('local-main','stable','Huawei Stable');self.device('local-private','private','My private collection','private')
  self.asset('main','local-main','huawei/Stable/origin/a.jpg','main');self.asset('private','local-private','huawei/Stable/origin/a.jpg','private')
  remote_device={'id':'remote','brand_name':'huawei','device_slug':'stable','device_name':'Huawei Stable'}
  old={'id':'remote-asset','device_id':'remote','origin_key':'huawei/Stable/origin/a.jpg','compress_key':'remote-cover.webp','name':'a','mime_type':'image/jpeg','file_format':'jpg','media_type':'static'}
  new={**old,'origin_key':'huawei/Stable/origin/new.jpg'}
  manifest={'d1_changes':[{'table':'w_wallpapers','before':old,'after':new,'reason':'normalize-asset-name-key'}],'aliases':[]}
  plan=self.module.build_plan(self.local,{'w_devices':[remote_device],'w_wallpapers':[old]},manifest)
  self.module.execute_sql(self.local,self.module.build_sql(plan['changes']))
  self.assertEqual(self.local.execute('SELECT count(*) FROM w_wallpapers').fetchone()[0],2)
  self.assertEqual(self.local.execute("SELECT device_id FROM w_wallpapers WHERE id='private'").fetchone()[0],'local-private')
 def test_matepad_removal_and_stale_guard_rollback(self):
  self.device('pad','pad','Huawei MatePad','huawei-matepad');self.asset('pad-asset','pad','huawei matepad/Pad/origin/a.jpg','a')
  self.device('safe','safe','Safe','private');self.asset('safe-asset','safe','private/Safe/origin/a.jpg','authored')
  plan=self.module.build_plan(self.local,{'w_devices':[],'w_wallpapers':[]},{'d1_changes':[],'aliases':[]})
  self.module.simulate(self.local,plan)
  self.local.execute("UPDATE w_wallpapers SET tags='[\"concurrent\"]' WHERE id='pad-asset'");self.local.commit()
  with self.assertRaises(sqlite3.IntegrityError):self.module.execute_sql(self.local,self.module.build_sql(plan['changes']))
  self.assertEqual(self.local.execute("SELECT count(*) FROM w_devices WHERE id='pad'").fetchone()[0],1)

if __name__=='__main__':unittest.main()
