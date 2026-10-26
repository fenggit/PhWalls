#!/usr/bin/env python3
"""Plan exact retired R2 keys. Reads database inputs; writes only review JSON/SQL."""
import argparse, collections, datetime, hashlib, json, re, sqlite3, time
from pathlib import Path

HEX=re.compile(r'^[a-f0-9]{64}$')

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def valid_key(key):return isinstance(key,str) and bool(key) and not key.startswith('/') and not any(p in ('','.','..') for p in key.split('/')) and not re.search(r'[\x00-\x1f\x7f\\]',key)
def references(rows):
 result=set()
 for row in rows:
  for column in ('origin_key','compress_key'):
   if row.get(column):result.add(row[column])
  origin=row.get('origin_key') or ''
  if row.get('media_type')=='dynamic' and '/origin/' in origin:result.add(origin.replace('/origin/','/preview/',1))
 return result

def read_database(path, sql_allowed=False):
 path=Path(path).resolve()
 if sql_allowed and path.suffix.lower()=='.sql':
  db=sqlite3.connect(':memory:');db.executescript(path.read_text())
 else:db=sqlite3.connect(path.as_uri()+'?mode=ro',uri=True)
 db.row_factory=sqlite3.Row
 try:
  db.execute('PRAGMA query_only=ON')
  rows=[dict(row) for row in db.execute('SELECT origin_key,compress_key,media_type FROM w_wallpapers')]
  tombstones=[dict(row) for row in db.execute('SELECT object_key,deleted_at FROM w_deleted_wallpaper_files')]
  return {'wallpapers':rows,'tombstones':tombstones}
 finally:db.close()

def read_journal(path):
 lines=Path(path).read_text().splitlines();result=[]
 for i,line in enumerate(lines):
  if not line.strip():continue
  try:result.append(json.loads(line))
  except json.JSONDecodeError:
   if i!=len(lines)-1:raise ValueError('Corrupt staging journal before final line')
 return result

def source_hash(manifest,obj,row):
 local=obj.get('local') or {};measured=row.get('source_sha256',row.get('sha256',''))
 if not isinstance(measured,str) or not HEX.fullmatch(measured) or row.get('backup_sha256',measured)!=measured:return None
 if row.get('cover_authority')=='local':
  overlay=row.get('coverAuthorityOverlaySHA256') or row.get('evidence_overlay_sha256')
  if row.get('source_sha256')!=measured or row.get('backup_sha256')!=measured or obj.get('role')!='compress_key' or not isinstance(overlay,str) or not HEX.fullmatch(overlay) or row.get('target_sha256')!=local.get('sha256') or row.get('sha256')!=row.get('target_sha256') or row.get('targetInfo',{}).get('size')!=local.get('size'):return None
  expected={}
  for change in manifest.get('d1_changes',[]):
   if change.get('table')!='w_wallpapers' or not change.get('after') or change['after'].get('compress_key')!=obj.get('target'):continue
   original=(change.get('before') or {}).get('origin_key')
   operation=next((item for item in manifest['r2_objects'] if item.get('role')=='origin_key' and item.get('source')==original and item.get('local')),None)
   pair=next((item for item in manifest.get('pairing_audit',{}).get('cover_pairings',[]) if item.get('cover_target')==obj.get('target')),None)
   digest=(operation or {}).get('local',{}).get('sha256') or (pair or {}).get('original_sha256')
   if not original or not digest:return None
   expected[original]=digest
  owners=row.get('authority_originals') or []
  if not expected or len(owners)!=len(expected) or any(owner.get('sha256')!=expected.get(owner.get('source')) or not owner.get('etag') or not isinstance(owner.get('size'),int) or owner['size']<1 for owner in owners) or len({owner.get('source') for owner in owners})!=len(expected):return None
 elif measured!=row.get('sha256') or (local.get('sha256') and measured!=local['sha256']):return None
 return measured

def build_plan(manifest,journal,remote_rows,local_rows,manifest_hash):
 if not HEX.fullmatch(manifest.get('snapshot_sha256','')) or not HEX.fullmatch(manifest_hash):raise ValueError('Frozen manifest and snapshot SHA256 are required')
 latest={}
 for row in journal:
  if row.get('manifest_sha256')==manifest_hash:latest[(row.get('source'),row.get('target'))]=row
 targets={row.get('target') for row in manifest['r2_objects'] if row.get('target')}
 refs=references(remote_rows)|references(local_rows)
 grouped=collections.defaultdict(list)
 for obj in manifest['r2_objects']:grouped[obj['source']].append(obj)
 prefix='_catalog-backups/'+manifest['snapshot_sha256'][:16]
 candidates=[];skipped=[]
 for source,objects in sorted(grouped.items()):
  reason=None;proofs=[]
  if not valid_key(source) or source.startswith('_catalog-'):reason='protected-or-synthetic-key'
  elif source in refs:reason='referenced-in-remote-or-local-database'
  elif source in targets:reason='manifest-target-preserved'
  elif any(obj.get('retain_source') for obj in objects):reason='explicit-retain-source'
  else:
   for obj in objects:
    row=latest.get((source,obj.get('target')))
    if not row or row.get('failed') or row.get('optionalMissing') or not row.get('verifiedAt') or not source_hash(manifest,obj,row):
     reason='no-latest-current-manifest-success';break
    source_info=row.get('sourceInfo') or {};backup_info=row.get('backupInfo') or {};target_info=row.get('targetInfo') or {}
    if row.get('backup')!=prefix+'/'+source or not source_info.get('etag') or not backup_info.get('etag') or not isinstance(source_info.get('size'),int) or source_info['size']<1 or backup_info.get('size')!=source_info['size']:
     reason='invalid-source-or-backup-proof';break
    if obj.get('target') and (not target_info.get('etag') or (row.get('cover_authority')!='local' and target_info.get('size')!=source_info['size'])):
     reason='invalid-fanout-target-proof';break
    proofs.append({**row,'retired_source_sha256':source_hash(manifest,obj,row)})
   if proofs and any((r['retired_source_sha256'],r['sourceInfo']['size'],r['sourceInfo']['etag'],r['backup'],r['backupInfo']['etag'])!=(proofs[0]['retired_source_sha256'],proofs[0]['sourceInfo']['size'],proofs[0]['sourceInfo']['etag'],proofs[0]['backup'],proofs[0]['backupInfo']['etag']) for r in proofs):reason='inconsistent-fanout-source-proof'
  if reason:skipped.append({'key':source,'reason':reason});continue
  row=proofs[0]
  candidates.append({'key':source,'source_etag':row['sourceInfo']['etag'],'backup_key':row['backup'],'backup_etag':row['backupInfo']['etag'],'sha256':row['retired_source_sha256'],'size':row['sourceInfo']['size'],'source_mime':row['sourceInfo'].get('mimeType'),'backup_mime':row['backupInfo'].get('mimeType'),'evidence_targets':sorted({r.get('target') for r in proofs},key=lambda x:x or '')})
 return {'version':1,'manifest_sha256':manifest_hash,'backup_prefix':prefix,'candidates':candidates,'skipped':skipped}

PREVIEW_SQL="substr(origin_key,1,instr(origin_key,'/origin/')-1)||'/preview/'||substr(origin_key,instr(origin_key,'/origin/')+8)"
def tombstone_sql(candidates,deleted_at):
 quote=lambda value:"'"+value.replace("'","''")+"'"
 values=','.join('('+quote(row['key'])+')' for row in candidates)
 if not values:return '-- No retired object candidates.\n'
 return f"WITH retired(object_key) AS (VALUES {values})\nINSERT OR IGNORE INTO w_deleted_wallpaper_files(object_key,deleted_at)\nSELECT r.object_key,{int(deleted_at)} FROM retired r\nWHERE NOT EXISTS (SELECT 1 FROM w_wallpapers WHERE origin_key=r.object_key OR compress_key=r.object_key OR (media_type='dynamic' AND instr(origin_key,'/origin/')>0 AND ({PREVIEW_SQL})=r.object_key));\n"

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 for flag in ['manifest','journal','remote-snapshot','local-db','out']:parser.add_argument('--'+flag,required=True)
 parser.add_argument('--chunk-size',type=int,default=100)
 args=parser.parse_args()
 if not 1<=args.chunk_size<=200:parser.error('--chunk-size must be 1..200')
 manifest=json.loads(Path(args.manifest).read_text());remote=read_database(args.remote_snapshot,True);local=read_database(args.local_db)
 result=build_plan(manifest,read_journal(args.journal),remote['wallpapers'],local['wallpapers'],sha(args.manifest))
 result.update({'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'created_at_ms':int(time.time()*1000),'journal_sha256':sha(args.journal),'remote_snapshot_sha256':sha(args.remote_snapshot),'local_reference_sha256':hashlib.sha256(json.dumps(sorted(references(local['wallpapers'])),ensure_ascii=False).encode()).hexdigest()})
 out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
 # Refuse to overwrite a reviewed plan or its SQL chunks.
 if out.exists():raise FileExistsError('Output plan already exists; choose a new review path')
 chunks=[result['candidates'][i:i+args.chunk_size] for i in range(0,len(result['candidates']),args.chunk_size)]
 paths=[out.with_name(out.stem+f'.tombstones-{i+1:04d}.sql') for i in range(len(chunks))]
 if any(path.exists() for path in paths):raise FileExistsError('SQL chunk already exists')
 result['tombstone_sql']=[str(path.resolve()) for path in paths]
 for path,chunk in zip(paths,chunks):
  with path.open('x') as handle:handle.write(tombstone_sql(chunk,result['created_at_ms']))
 with out.open('x') as handle:handle.write(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'candidates':len(result['candidates']),'skipped':len(result['skipped']),'sql_chunks':len(chunks),'plan_sha256':sha(out)}))
if __name__=='__main__':main()
