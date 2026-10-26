#!/usr/bin/env python3
"""Plan this catalog cleanup against a LOCAL SQLite backup without touching live D1.

Produces full-row guarded apply/rollback SQL, exact in-memory simulation evidence,
and surviving keys for the R2 pruner's union reference check. Does not apply SQL
or read the active database. Use a consistent SQLite backup, not a live WAL file.
"""
import argparse, collections, copy, hashlib, json, re, sqlite3
from pathlib import Path

TABLES=('w_devices','w_wallpapers','w_device_i18n','w_live_device_i18n')
TEXT_FIELDS=('display_name','seo_title','description')
ASSET_FIELDS=('origin_key','compress_key','name','mime_type','file_format')

def rows(db,table):return [dict(row) for row in db.execute('SELECT * FROM '+table+' ORDER BY id')]
def file_hash(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def editorial(text,old,new):
 if not text or not old or old==new:return text
 text=text.replace(old,new)
 old_model=old.partition(' ')[2];new_model=new.partition(' ')[2]
 if old_model and old_model!=new_model:text=text.replace(old_model,new_model)
 return text

def build_plan(local,remote_before,manifest):
 before={table:{row['id']:row for row in rows(local,table)}for table in TABLES}
 after=copy.deepcopy(before);notes=[];issues=[]
 remote={table:{row['id']:dict(row)for row in remote_before.get(table,[])}for table in ('w_devices','w_wallpapers')}
 remote_after=copy.deepcopy(remote)
 duplicate={}
 for change in manifest['d1_changes']:
  table=change['table']
  if table not in remote_after:continue
  key=(change.get('before')or change['after'])['id']
  if change['after'] is None:remote_after[table].pop(key,None)
  else:remote_after[table][key]=change['after']
  if change['reason']=='duplicate-original':duplicate[key]=change['winner_id']
 def winner(key):
  seen=set()
  while key in duplicate:
   if key in seen:raise ValueError('Cyclic remote duplicate mapping')
   seen.add(key);key=duplicate[key]
  return key
 local_identity={(d['brand_name'],d['device_slug']):d['id']for d in before['w_devices'].values()}
 remote_to_local={rid:local_identity[(d['brand_name'],d['device_slug'])]for rid,d in remote['w_devices'].items()if(d['brand_name'],d['device_slug'])in local_identity}
 local_merges={};aliases=[]
 for alias in manifest.get('aliases',[]):
  old=local_identity.get((alias['brand'],alias['old_slug']));new=local_identity.get((alias['brand'],alias['new_slug']))
  if old and not new:
   new=old;after['w_devices'][new]['device_slug']=alias['new_slug']
   notes.append({'kind':'promote-local-device','id':old,'slug':alias['new_slug']})
  if new:remote_to_local[alias['new_id']]=new
  if old and new:
   remote_to_local[alias['old_id']]=new
   if old!=new:local_merges[old]=new
   aliases.append({**alias,'local_old_id':old,'local_new_id':new})
 removed={d['id']for d in before['w_devices'].values()if d['brand_name']=='huawei-matepad'}
 desired_names={}
 for rid,target in remote_after['w_devices'].items():
  lid=remote_to_local.get(rid)
  if lid is not None:desired_names[lid]=target['device_name']
 for lid,name in desired_names.items():
  after['w_devices'][lid]['device_name']=name
  after['w_devices'][lid]['name_key']=re.sub(r'\s+',' ',name.strip()).casefold()
 for losing,canonical in local_merges.items():
  group=[before['w_devices'][canonical],before['w_devices'][losing]]
  if any(row['status']=='published'for row in group):after['w_devices'][canonical]['status']='published'
  after['w_devices'].pop(losing,None)
 for lid in removed:after['w_devices'].pop(lid,None)
 by_origin=collections.defaultdict(list)
 for row in remote['w_wallpapers'].values():by_origin[(row['origin_key'],row['media_type'])].append(row)
 groups=collections.defaultdict(list);mapped_count=0;mapped_ids=set()
 for lid,row in list(after['w_wallpapers'].items()):
  if row['device_id']in removed:after['w_wallpapers'].pop(lid);continue
  original_device=before['w_devices'][row['device_id']]
  row['device_id']=local_merges.get(row['device_id'],row['device_id'])
  candidates=by_origin.get((row['origin_key'],row['media_type']),[])
  if len(candidates)>1:
   exact=[r for r in candidates if(remote['w_devices'][r['device_id']]['brand_name'],remote['w_devices'][r['device_id']]['device_slug'])==(original_device['brand_name'],original_device['device_slug'])]
   if exact:candidates=exact
  if len(candidates)>1:
   finals={json.dumps(remote_after['w_wallpapers'].get(winner(r['id'])),sort_keys=True)for r in candidates}
   if len(finals)==1:candidates=candidates[:1]
   else:issues.append({'kind':'ambiguous-remote-origin','local_id':lid,'origin_key':row['origin_key']});continue
  if not candidates:continue
  matched=candidates[0];wid=winner(matched['id']);target=remote_after['w_wallpapers'].get(wid)
  if target is None:
   issues.append({'kind':'unmapped-remote-removal','local_id':lid,'remote_id':matched['id']});continue
  mapped_count+=1;mapped_ids.add(lid)
  for field in ASSET_FIELDS:
   if field in target and matched.get(field)!=target[field]:row[field]=target[field]
  groups[(row['device_id'],row['media_type'],wid)].append(lid)
 for (_device,_media,wid),members in groups.items():
  if len(members)<2:continue
  members.sort(key=lambda lid:(before['w_wallpapers'][lid]['device_id']in local_merges,after['w_wallpapers'][lid]['status']!='published',not after['w_wallpapers'][lid]['is_primary'],after['w_wallpapers'][lid]['create_date'],lid))
  keep=members[0];retained=after['w_wallpapers'][keep];tags=[]
  for lid in members:
   for tag in json.loads(after['w_wallpapers'][lid]['tags']or'[]'):
    if tag not in tags:tags.append(tag)
  retained['tags']=json.dumps(tags,ensure_ascii=False,separators=(',',':'))
  if any(after['w_wallpapers'][lid]['status']=='published'for lid in members):retained['status']='published'
  retained['is_primary']=int(any(after['w_wallpapers'][lid]['is_primary']for lid in members))
  for lid in members[1:]:after['w_wallpapers'].pop(lid)
  notes.append({'kind':'confirmed-original-coalescence','remote_winner_id':wid,'local_winner_id':keep,'removed_local_ids':members[1:]})
 # Retain every distinct local-only original. Resolve only the storage uniqueness
 # collision; its original authored name is retained in the full-row plan.
 names=collections.defaultdict(list)
 for row in after['w_wallpapers'].values():names[(row['device_id'],row['media_type'],row['name'])].append(row)
 for group in names.values():
  group.sort(key=lambda row:(before['w_wallpapers'][row['id']]['device_id']in local_merges,row['id']))
  for row in group[1:]:
   old=row['name'];row['name']=old+'-local-'+row['id'][:12]
   notes.append({'kind':'retain-distinct-local-name','id':row['id'],'before':old,'after':row['name']})
 primaries=collections.defaultdict(list)
 for row in after['w_wallpapers'].values():
  if row['is_primary']:primaries[(row['device_id'],row['category'],row['media_type'])].append(row)
 for group in primaries.values():
  group.sort(key=lambda row:(row['status']!='published',before['w_wallpapers'][row['id']]['device_id']in local_merges,row['create_date'],row['id']))
  for row in group[1:]:row['is_primary']=0;notes.append({'kind':'primary-collision','retained_id':group[0]['id'],'demoted_id':row['id']})
 for table in ('w_device_i18n','w_live_device_i18n'):
  translations=after[table]
  for tid,text in list(translations.items()):
   old_device=text['device_id']
   if old_device in removed:translations.pop(tid);continue
   destination=local_merges.get(old_device,old_device)
   new_name=after['w_devices'][destination]['device_name']
   old_name=before['w_devices'][old_device]['device_name']
   for field in TEXT_FIELDS:text[field]=editorial(text[field],old_name,new_name)
   text['device_id']=destination
  scopes=collections.defaultdict(list)
  for text in translations.values():scopes[(text['device_id'],text['language'])].append(text)
  for group in scopes.values():
   group.sort(key=lambda row:(before[table][row['id']]['device_id']in local_merges,row['id']))
   canonical=group[0]
   for alternative in group[1:]:
    conflicts={}
    for field in TEXT_FIELDS:
     if not canonical[field]and alternative[field]:canonical[field]=alternative[field]
     elif canonical[field]and alternative[field]and canonical[field]!=alternative[field]:conflicts[field]={'retained':canonical[field],'alternative':alternative[field]}
    notes.append({'kind':'merge-local-translation','table':table,'retained_id':canonical['id'],'removed_id':alternative['id'],'authored_conflicts':conflicts})
    translations.pop(alternative['id'])
 timestamp=max([r.get('updated_date',0)for c in manifest['d1_changes']for r in [c.get('after')or{}]]+[1])
 changes=[]
 for table in TABLES:
  for key in sorted(set(before[table])|set(after[table])):
   old=before[table].get(key);new=after[table].get(key)
   if old==new:continue
   if new and old and 'updated_date'in new:new['updated_date']=max(timestamp,old['updated_date']+1)
   changes.append({'table':table,'before':old,'after':new})
 affected_devices=set()
 for c in changes:
  for row in [c['before'],c['after']]:
   if row:affected_devices.add(row['id']if c['table']=='w_devices'else row['device_id'])
 for device in affected_devices:
  row=before['w_devices'].get(device)
  if row and row.get('deletion_state','none')!='none':issues.append({'kind':'device-deletion-lock','id':device})
  if local.execute('SELECT 1 FROM w_collection_deletions WHERE device_id=?',(device,)).fetchone():issues.append({'kind':'collection-deletion-lock','id':device})
 for c in changes:
  if c['table']=='w_wallpapers'and c['before'].get('deletion_state','none')!='none':issues.append({'kind':'wallpaper-deletion-lock','id':c['before']['id']})
 references=set()
 for row in after['w_wallpapers'].values():
  references.update(row[field]for field in ['origin_key','compress_key']if row[field])
  if row['media_type']=='dynamic':references.add(row['origin_key'].replace('/origin/','/preview/'))
 unmatched=[{key:row[key]for key in ['id','device_id','origin_key','media_type']}for row in after['w_wallpapers'].values()if row['id']not in mapped_ids]
 return {'version':1,'unmatched_local_assets':unmatched,'changes':changes,'aliases':aliases,'notes':notes,'issues':issues,'affected_device_ids':sorted(affected_devices),'surviving_object_keys':sorted(references),
  'summary':{'before_counts':{table:len(value)for table,value in before.items()},'after_counts':{table:len(value)for table,value in after.items()},'preserved_unmatched_assets':len(unmatched),'mapped_local_assets':mapped_count,'local_device_merges':len(local_merges),'removed_matepad_devices':len(removed),'changes':dict(collections.Counter(c['table']for c in changes)),'operations':dict(collections.Counter('delete'if c['after']is None else'update'for c in changes))}}

def quote(value):
 if value is None:return 'NULL'
 if isinstance(value,(int,float)):return str(value)
 return "'"+str(value).replace("'","''")+"'"
def where(row):return ' AND '.join('"'+key+'" IS '+quote(value)for key,value in row.items())
def exists(table,row):return 'EXISTS (SELECT 1 FROM '+table+' WHERE '+where(row)+')'
def insert(table,row):return 'INSERT INTO '+table+' ('+','.join('"'+k+'"'for k in row)+') VALUES ('+','.join(quote(v)for v in row.values())+');'
def update(table,row):return 'UPDATE '+table+' SET '+','.join('"'+k+'"='+quote(v)for k,v in row.items()if k!='id')+' WHERE id='+quote(row['id'])+';'
def build_sql(changes):
 out=['PRAGMA foreign_keys=ON;','BEGIN IMMEDIATE;','CREATE TEMP TABLE IF NOT EXISTS local_catalog_sync_guard (ok INTEGER NOT NULL CHECK (ok=1));','DELETE FROM local_catalog_sync_guard;']
 device_ids=set()
 for change in changes:
  table,old,new=change['table'],change['before'],change['after'];rid=(old or new)['id']
  allowed=[exists(table,row)for row in [old,new]if row]
  if old is None or new is None:allowed.append('NOT EXISTS (SELECT 1 FROM '+table+' WHERE id='+quote(rid)+')')
  out.append('INSERT INTO local_catalog_sync_guard VALUES (CASE WHEN '+' OR '.join(allowed)+' THEN 1 ELSE 0 END);')
  if table=='w_devices'and new is None:
   # New children after planning must not disappear through FK cascades.
   for child in ['w_wallpapers','w_device_i18n','w_live_device_i18n']:
    expected=[c['before']['id']for c in changes if c['table']==child and c['before']and c['before']['device_id']==rid]
    predicate='device_id='+quote(rid)
    if expected:predicate+=' AND id NOT IN ('+','.join(quote(x)for x in expected)+')'
    out.append('INSERT INTO local_catalog_sync_guard VALUES (CASE WHEN NOT EXISTS (SELECT 1 FROM '+child+' WHERE '+predicate+') THEN 1 ELSE 0 END);')
  for row in [old,new]:
   if row:device_ids.add(row['id']if table=='w_devices'else row['device_id'])
 if device_ids:out.append('INSERT INTO local_catalog_sync_guard VALUES (CASE WHEN NOT EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id IN ('+','.join(quote(x)for x in sorted(device_ids))+')) THEN 1 ELSE 0 END);')
 # Temporarily vacate unique names and primary slots. All source rows have been
 # fully checked; BEGIN IMMEDIATE prevents another writer between checks/writes.
 for c in changes:
  row=c['before']or c['after'];table=c['table']
  if table=='w_wallpapers':out.append('UPDATE w_wallpapers SET name='+quote('__local_sync_'+row['id'])+',is_primary=0 WHERE id='+quote(row['id'])+';')
  if table=='w_devices'and c['before']and c['after']:
   placeholder='__local_sync_'+row['id'];out.append('UPDATE w_devices SET device_name='+quote(placeholder)+',name_key='+quote(placeholder)+',device_slug='+quote(placeholder)+' WHERE id='+quote(row['id'])+';')
 for c in changes:
  if c['after']is None and c['table']!='w_devices':out.append('DELETE FROM '+c['table']+' WHERE id='+quote(c['before']['id'])+';')
 for c in changes:
  if c['before']is None and c['table']=='w_devices':out.append(insert(c['table'],c['after']))
 for table in ['w_wallpapers','w_device_i18n','w_live_device_i18n']:
  for c in changes:
   if c['table']==table and c['before']and c['after']:out.append(update(table,c['after']))
  for c in changes:
   if c['table']==table and c['before']is None:out.append(insert(table,c['after']))
 for c in changes:
  if c['table']=='w_devices'and c['after']is None:out.append('DELETE FROM w_devices WHERE id='+quote(c['before']['id'])+';')
 for c in changes:
  if c['table']=='w_devices'and c['before']and c['after']:out.append(update('w_devices',c['after']))
 for c in changes:
  table,new=c['table'],c['after'];rid=(c['before']or new)['id']
  predicate=exists(table,new)if new else'NOT EXISTS (SELECT 1 FROM '+table+' WHERE id='+quote(rid)+')'
  out.append('INSERT INTO local_catalog_sync_guard VALUES (CASE WHEN '+predicate+' THEN 1 ELSE 0 END);')
 out.extend(['DROP TABLE local_catalog_sync_guard;','COMMIT;'])
 return '\n'.join(out)+'\n'
def execute_sql(db,sql):
 db.commit()
 try:db.executescript(sql)
 except Exception:
  db.rollback();raise

def data_snapshot(db):
 return {name:[tuple(row)for row in db.execute('SELECT * FROM "'+name+'" ORDER BY rowid')]for(name,)in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")}
def simulate(source,plan):
 if plan['issues']:raise ValueError('Unresolved local sync issues: '+json.dumps(plan['issues'],ensure_ascii=False))
 clone=sqlite3.connect(':memory:');clone.row_factory=sqlite3.Row;source.commit();source.backup(clone);clone.execute('PRAGMA foreign_keys=ON')
 initial=data_snapshot(clone);forward=build_sql(plan['changes']);reverse=build_sql([{**c,'before':c['after'],'after':c['before']}for c in plan['changes']])
 execute_sql(clone,forward);first=data_snapshot(clone)
 if list(clone.execute('PRAGMA foreign_key_check')):raise AssertionError('Foreign key violations after local sync')
 execute_sql(clone,forward)
 if data_snapshot(clone)!=first:raise AssertionError('Local sync is not idempotent')
 execute_sql(clone,reverse)
 # Row insertion order may differ after restoring deletions. Compare all data,
 # including tables outside the edited catalog, by deterministic serialized rows.
 canonical=lambda tables:{k:sorted([json.dumps(row,ensure_ascii=False)for row in v])for k,v in tables.items()}
 if canonical(data_snapshot(clone))!=canonical(initial):raise AssertionError('Rollback did not restore every original row')
 if list(clone.execute('PRAGMA foreign_key_check')):raise AssertionError('Foreign key violations after rollback')
 clone.close();plan['summary']['simulation']='apply + idempotent repeat + full-row rollback + foreign keys passed'

def main():
 parser=argparse.ArgumentParser(description=__doc__)
 parser.add_argument('--local-snapshot',required=True);parser.add_argument('--remote-before',required=True);parser.add_argument('--manifest',required=True);parser.add_argument('--manifest-sha256');parser.add_argument('--out',required=True)
 args=parser.parse_args();local_path=Path(args.local_snapshot).resolve();manifest_path=Path(args.manifest).resolve();remote_path=Path(args.remote_before).resolve()
 if local_path.name.endswith(('-wal','-shm'))or'.wrangler'in local_path.parts:parser.error('Use a consistent backup outside the active .wrangler directory')
 manifest=json.loads(manifest_path.read_text());manifest_hash=file_hash(manifest_path)
 if args.manifest_sha256 and args.manifest_sha256!=manifest_hash:raise ValueError('Catalog manifest hash changed')
 if manifest.get('snapshot_sha256')and manifest['snapshot_sha256']!=file_hash(remote_path):raise ValueError('Remote baseline hash differs from catalog manifest')
 local=sqlite3.connect(local_path.as_uri()+'?mode=ro&immutable=1',uri=True);local.row_factory=sqlite3.Row
 remote=sqlite3.connect(':memory:');remote.row_factory=sqlite3.Row;remote.executescript(remote_path.read_text())
 plan=build_plan(local,{table:rows(remote,table)for table in ['w_devices','w_wallpapers']},manifest)
 plan['sources']={'local_snapshot':str(local_path),'local_snapshot_sha256':file_hash(local_path),'remote_before':str(remote_path),'remote_before_sha256':file_hash(remote_path),'manifest':str(manifest_path),'manifest_sha256':manifest_hash}
 simulate(local,plan)
 out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
 (out/'plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2)+'\n')
 (out/'apply.sql').write_text(build_sql(plan['changes']))
 (out/'rollback.sql').write_text(build_sql([{**c,'before':c['after'],'after':c['before']}for c in plan['changes']]))
 (out/'surviving-object-keys.json').write_text(json.dumps(plan['surviving_object_keys'],ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'summary':plan['summary'],'issues':plan['issues'],'sources':plan['sources']},ensure_ascii=False,indent=2))
if __name__=='__main__':main()
