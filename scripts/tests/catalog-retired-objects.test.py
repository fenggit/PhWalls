import importlib.util, unittest, sqlite3
from pathlib import Path
from types import SimpleNamespace
path=Path(__file__).parents[1]/'catalog-retired-objects.py'
if path.exists():
 spec=importlib.util.spec_from_file_location('retired',path);retired=importlib.util.module_from_spec(spec);spec.loader.exec_module(retired)
else:retired=SimpleNamespace()
HASH='a'*64

def evidence(source='old/origin/a.jpg', target='new/origin/a.jpg', **changes):
 row={'manifest_sha256':HASH,'source':source,'target':target,'backup':'_catalog-backups/'+('1'*16)+'/'+source,'sha256':'b'*64,'sourceInfo':{'size':10,'etag':'"old"','mimeType':'image/jpeg'},'backupInfo':{'size':10,'etag':'"backup"','mimeType':'image/jpeg'},'targetInfo':{'size':10,'etag':'"target"','mimeType':'image/jpeg'},'verifiedAt':'2026-10-26T00:00:00Z'};row.update(changes);return row

def plan(objects=None,journal=None,remote=None,local=None):
 assert callable(getattr(retired,'build_plan',None)), 'retired-object planner missing'
 return retired.build_plan({'snapshot_sha256':'1'*64,'r2_objects':objects or [{'source':'old/origin/a.jpg','target':'new/origin/a.jpg'}]},journal if journal is not None else [evidence()],remote or [],local or [],HASH)

class RetiredTests(unittest.TestCase):
 def test_only_old_unreferenced_backed_sources_are_candidates(self):
  result=plan(remote=[{'origin_key':'new/origin/a.jpg','compress_key':'new/compress/a.webp','media_type':'static'}])
  self.assertEqual([r['key'] for r in result['candidates']],['old/origin/a.jpg']);self.assertEqual(result['candidates'][0]['source_etag'],'"old"')
 def test_active_cover_and_derived_preview_in_either_database_block_retirement(self):
  for database in ['remote','local']:
   for key,row in [('old/origin/a.jpg',{'origin_key':'unrelated','compress_key':'old/origin/a.jpg','media_type':'static'}),('old/preview/a.mp4',{'origin_key':'old/origin/a.mp4','compress_key':None,'media_type':'dynamic'})]:
    result=plan(objects=[{'source':key,'target':'new/file'}],journal=[evidence(key,'new/file')],**{database:[row]})
    self.assertEqual(result['candidates'],[])
 def test_latest_current_manifest_failure_or_missing_backup_never_reuses_old_success(self):
  for latest in [{'failed':True},{'optionalMissing':True},{'sourceInfo':None},{'backupInfo':{'size':11,'etag':'"backup"'}},{'sha256':'bad'}]:
   self.assertEqual(plan(journal=[evidence(),evidence(**latest)])['candidates'],[])
  self.assertEqual(plan(journal=[evidence(manifest_sha256='c'*64)])['candidates'],[])
 def test_active_fanout_target_and_synthetic_keys_are_preserved(self):
  objects=[{'source':'old/origin/a.jpg','target':'new/origin/a.jpg'},{'source':'other','target':'old/origin/a.jpg'},{'source':'_catalog-generated/cover.webp','target':'new/cover.webp'}]
  self.assertEqual(plan(objects=objects,journal=[evidence(),evidence('other','old/origin/a.jpg'),evidence('_catalog-generated/cover.webp','new/cover.webp')],remote=[{'origin_key':'old/origin/a.jpg','compress_key':None,'media_type':'static'}])['candidates'][0]['key'],'other')
 def test_every_fanout_needs_matching_source_and_backup_proof(self):
  objects=[{'source':'old/origin/a.jpg','target':'new/one.jpg'},{'source':'old/origin/a.jpg','target':'new/two.jpg'}]
  self.assertEqual(plan(objects=objects,journal=[evidence(target='new/one.jpg')])['candidates'],[])
 def test_tombstone_sql_rechecks_all_statuses_and_derived_preview_at_execution(self):
  self.assertTrue(callable(getattr(retired,'tombstone_sql',None)))
  db=sqlite3.connect(':memory:');db.executescript('CREATE TABLE w_wallpapers(origin_key TEXT,compress_key TEXT,media_type TEXT);CREATE TABLE w_deleted_wallpaper_files(object_key TEXT PRIMARY KEY,deleted_at INTEGER);')
  result=plan();script=retired.tombstone_sql(result['candidates'],123)
  db.execute("INSERT INTO w_wallpapers VALUES('x','old/origin/a.jpg','static')");db.executescript(script)
  self.assertEqual(db.execute('SELECT COUNT(*) FROM w_deleted_wallpaper_files').fetchone()[0],0)
  db.execute('DELETE FROM w_wallpapers');db.executescript(script)
  self.assertEqual(db.execute('SELECT object_key FROM w_deleted_wallpaper_files').fetchone()[0],'old/origin/a.jpg')
  db.executescript("DELETE FROM w_deleted_wallpaper_files;INSERT INTO w_wallpapers VALUES('old/origin/a.mp4',NULL,'dynamic');")
  db.executescript(retired.tombstone_sql([{'key':'old/preview/a.mp4'}],123))
  self.assertEqual(db.execute('SELECT COUNT(*) FROM w_deleted_wallpaper_files').fetchone()[0],0)
 def test_database_reader_never_creates_or_mutates_local_database(self):
  import tempfile,hashlib
  with tempfile.TemporaryDirectory() as directory:
   path=Path(directory)/'local.sqlite';db=sqlite3.connect(path);db.executescript('CREATE TABLE w_wallpapers(origin_key TEXT,compress_key TEXT,media_type TEXT);CREATE TABLE w_deleted_wallpaper_files(object_key TEXT,deleted_at INTEGER);INSERT INTO w_wallpapers VALUES("keep","cover","static");');db.close()
   before=hashlib.sha256(path.read_bytes()).hexdigest();data=retired.read_database(path)
   self.assertEqual(data['wallpapers'][0]['origin_key'],'keep');self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),before)
   absent=Path(directory)/'absent.sqlite'
   with self.assertRaises(sqlite3.OperationalError):retired.read_database(absent)
   self.assertFalse(absent.exists())
 def test_local_cover_authority_uses_old_source_hash_and_size_with_frozen_owner_proof(self):
  cover={'source':'old/compress/cover.webp','target':'new/compress/cover.webp','role':'compress_key','local':{'sha256':'c'*64,'size':7}}
  original={'source':'old/origin/owner.jpg','target':'new/origin/owner.jpg','role':'origin_key','local':{'sha256':'e'*64,'size':20}}
  manifest={'snapshot_sha256':'1'*64,'r2_objects':[cover,original],'d1_changes':[{'table':'w_wallpapers','before':{'origin_key':original['source']},'after':{'compress_key':cover['target']}}]}
  proof=evidence(cover['source'],cover['target'],sha256='c'*64,cover_authority='local',coverAuthorityOverlaySHA256='d'*64,source_sha256='b'*64,backup_sha256='b'*64,target_sha256='c'*64,targetInfo={'etag':'"new-local"','size':7},authority_originals=[{'source':original['source'],'sha256':'e'*64,'etag':'"owner"','size':20}])
  result=retired.build_plan(manifest,[proof],[],[],HASH)
  self.assertEqual(result['candidates'][0]['sha256'],'b'*64);self.assertEqual(result['candidates'][0]['size'],10)
  for changed in [{'authority_originals':[]},{'backup_sha256':'f'*64},{'coverAuthorityOverlaySHA256':None}]:
   self.assertEqual(retired.build_plan(manifest,[{**proof,**changed}],[],[],HASH)['candidates'],[])
if __name__=='__main__':unittest.main()
