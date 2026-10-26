#!/usr/bin/env python3
"""Content-hash catalog audit and recoverable local normalization.

Audit is read-only. SQL output is conditionally guarded and simulated/rolled back
against the supplied export. R2 preparation must succeed before applying SQL.
Run --help for commands. Never reads or prints credentials.
"""
import argparse, collections, concurrent.futures, hashlib, json, os, re, shutil, sqlite3, time, subprocess, sys
from pathlib import Path

MEDIA={'.jpg','.jpeg','.png','.webp','.bmp','.gif','.mp4','.mov','.m4v','.webm','.avif','.heic'}
BRANDS={'android':'Android','asus rog phone':'ASUS ROG Phone','google pixel':'Google Pixel','google':'Google','harmonyos':'HarmonyOS','honor':'Honor','huawei':'Huawei','iqoo':'iQOO','motorola':'Motorola','nothing':'Nothing','oneplus':'OnePlus','oppo':'OPPO','poco':'POCO','realme':'realme','redmi':'Redmi','samsung':'Samsung','sony':'Sony','transsion infinix':'Infinix','transsion tecno':'TECNO','vivo':'vivo','xiaomi':'Xiaomi','nio':'NIO','nubia':'nubia','redmagic':'REDMAGIC','zte':'ZTE','htc':'HTC','hmd':'HMD','lg':'LG','sharp':'SHARP'}
PREFIX_OVERRIDES={}
FORMAT_OVERRIDES={}
PREFIX_CASE={'oppo':'OPPO','poco':'POCO','realme':'realme','vivo':'vivo','iqoo':'iQOO','nio':'NIO','nubia':'nubia','tecno':'TECNO','infinix':'Infinix','redmagic':'REDMAGIC','honor':'Honor','huawei':'Huawei','nothing':'Nothing','oneplus':'OnePlus','samsung':'Samsung'}
LIVE_BRAND_SLUGS={name.replace(' ','-'):name.replace(' ','-') for name in BRANDS}
LIVE_BRAND_SLUGS.update({'asus':'asus-rog-phone','black-shark':'black-shark','fairphone':'fairphone','lava':'lava','lenovo':'lenovo','meizu':'meizu','micromax':'micromax','nokia':'nokia','smartisan':'smartisan','sharp':'sharp'})

def normalize_label(value):
 value=re.sub(r'\s+',' ',value.strip())
 if value.casefold()=='huawei mate 70 pro(+)':return 'Huawei Mate 70 Pro'
 value=value.replace('_',' ').replace(':',' and ')
 value=re.sub(r'\(\s*\+\s*\)', ' Plus',value)
 value=value.replace('(',' ').replace(')',' ')
 for prefix,canonical in PREFIX_CASE.items():
  value=re.sub(r'^'+re.escape(prefix)+r'(?=\s|$)',canonical,value,flags=re.I)
 return re.sub(r'\s+',' ',value).strip()

def normalize_editorial(text,old_name,new_name):
 if not text:return text
 text=text.replace(old_name,new_name)
 # Replace the exact Latin model fragment even when the brand is translated.
 old_model=old_name.split(' ',1)[1] if ' ' in old_name else old_name
 new_model=new_name.split(' ',1)[1] if ' ' in new_name else new_name
 if old_model!=new_model:text=text.replace(old_model,new_model)
 old_prefix=old_name.split(' ',1)[0];new_prefix=new_name.split(' ',1)[0]
 if old_prefix!=new_prefix:text=re.sub(r'(?<![A-Za-z])'+re.escape(old_prefix)+r'(?![A-Za-z])',new_prefix,text)
 return text

def normalize_filename(value):
 stem,ext=os.path.splitext(value)
 stem=stem.lower().replace('+','-plus-')
 stem=re.sub(r'[^\w-]+','-',stem,flags=re.UNICODE).replace('_','-')
 return re.sub('-+','-',stem).strip('-')+ext.lower()

def normalize_path(value):
 source_value=value
 parts=Path(value).parts
 for old,new in sorted(PREFIX_OVERRIDES.items(),key=lambda x:-len(x[0])):
  if value.startswith(old+'/'):
   value=new+value[len(old):];parts=Path(value).parts;break
 if parts and parts[0].casefold()=='live':
  if len(parts)!=5 or parts[3].casefold() not in ('origin','compress','preview'):
   raise ValueError('Live 输入须为品牌/型号/origin、compress 或 preview/文件')
  brand=LIVE_BRAND_SLUGS.get(re.sub(r'\s+','-',parts[1].strip().casefold()))
  if brand is None:raise ValueError('无法识别 Live 品牌，须明确设置对应品牌目录：'+parts[1])
  model=normalize_label(parts[2])
  if brand=='google' and re.search(r'\bpixel\b',model,re.I):brand='google-pixel'
  if brand=='nubia' and re.search(r'\bred\s*magic\b',model,re.I):brand='redmagic'
  # Unindexed inputs still need the same physical layout. Publication remains
  # a separate operation; absence from D1 must not preserve a second Live tree.
  parts=(brand,model,parts[3].casefold(),parts[4])
 result=[]
 for i,p in enumerate(parts[:-1]):
  if p.lower() in ('origin','compress'):p=p.lower()
  elif i==0 and p.lower()!='live' and p.lower()!='desktopwalls':p=re.sub(r'[^a-z0-9]+','-',p.casefold()).strip('-')
  else:p=normalize_label(p)
  result.append(p)
 filename=normalize_filename(parts[-1]);actual=FORMAT_OVERRIDES.get(source_value)
 if actual and not (actual=='.jpg' and Path(filename).suffix=='.jpeg'):filename=str(Path(filename).with_suffix(actual))
 return str(Path(*result,filename))

def collection_role(path):
 p=Path(path).parts
 for i,x in enumerate(p):
  if x.lower() in ('origin','compress'):
   return '/'.join(p[:i]),x.lower()
 return '/'.join(p[:-1]),'other'

def clone_copy(source,target):
 # APFS copy-on-write clones are independent files, so later edits cannot mutate
 # the retained rollback copy. Fail safely if the source volume cannot clone.
 if sys.platform=='darwin':subprocess.run(['cp','-c',str(source),str(target)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 else:shutil.copy2(source,target)

def digest(path,algorithm='sha256'):
 h=hashlib.new(algorithm)
 with open(path,'rb') as f:
  while chunk:=f.read(1024*1024):h.update(chunk)
 return h.hexdigest()

def detected_extension(path):
 with open(path,'rb') as f:header=f.read(16)
 return '.png' if header.startswith(b'\x89PNG\r\n\x1a\n') else '.jpg' if header.startswith(b'\xff\xd8\xff') else '.webp' if header[:4]==b'RIFF' and header[8:12]==b'WEBP' else '.bmp' if header[:2]==b'BM' else None

def inventory_file(root,path):
 hashes={a:hashlib.new(a) for a in ['sha256','md5']}
 with open(path,'rb') as f:
  while chunk:=f.read(1024*1024):
   for h in hashes.values():h.update(chunk)
 return {'path':str(path.relative_to(root)),'size':path.stat().st_size,**{a:h.hexdigest() for a,h in hashes.items()}}

def add_qualifier(stem,qualifier):
 # Keep the existing light/dark and required Fold markers at the very end.
 folded=stem.endswith('-fold')
 if folded:stem=stem[:-5]
 mode=''
 for token in ['light','dark']:
  if stem.endswith('-'+token):stem=stem[:-(len(token)+1)];mode='-'+token;break
 return stem+'-'+qualifier+mode+('-fold' if folded else '')

def folded_stem(stem,collection):
 return stem if not re.search(r'(?i)(?:^|[\s/-])fold(?:$|[\s/-])',collection) or stem.endswith('-fold') else stem+'-fold'

def role_of(row):return collection_role(row['path'])[1]
def media_of(row):return 'dynamic' if Path(row['path']).suffix.lower() in {'.mp4','.mov','.m4v','.webm'} else 'static'

def local_pairs(rows,root=None,out=None):
 """Plan original identities first, then attach one cover to each survivor.

 Covers with identical bytes remain separate when distinct surviving originals
 need their own pair. Ambiguous static covers are rebuilt from the measured
 original into the ignored output folder; no source media is edited here.
 """
 by_path={r['path']:r for r in rows};origins=[r for r in rows if role_of(r)=='origin' and not r['path'].casefold().startswith('huawei matepad/')]
 source_stems=collections.defaultdict(list);content_groups=collections.defaultdict(list)
 for row in origins:
  p=Path(row['path']);source_stems[(str(p.parent),p.stem.casefold())].append(row)
  collection,_=collection_role(normalize_path(row['path']))
  content_groups[(collection,media_of(row),row['sha256'])].append(row)
 pairs={};winners=[];duplicate_origins={};cover_associations=collections.defaultdict(list);report={'source_stem_collisions':[],'canonical_stem_collisions':[],'generated_covers':[],'cover_pairings':[],'unresolved_covers':[]}
 for group in content_groups.values():
  group.sort(key=lambda r:(r['path']!=normalize_path(r['path']),r['path']))
  winner=group[0];winner={'row':winner,'group':group,'target':normalize_path(winner['path'])};p=Path(winner['target']);collection,_=collection_role(winner['target'])
  winner['target']=str(p.with_name(folded_stem(p.stem,collection)+p.suffix));winners.append(winner)
 for group in source_stems.values():
  if len({r['sha256'] for r in group})>1:report['source_stem_collisions'].append([r['path'] for r in group])
 target_stems=collections.defaultdict(list)
 for winner in winners:
  p=Path(winner['target']);collection,_=collection_role(winner['target']);target_stems[(collection,p.stem.casefold())].append(winner)
 for group in target_stems.values():
  if len(group)<2:continue
  report['canonical_stem_collisions'].append([r['row']['path'] for r in group])
  extensions=[Path(x['target']).suffix.lstrip('.') for x in group]
  for winner in group:
   p=Path(winner['target']);ext=p.suffix.lstrip('.');qualifier='src-'+ext if extensions.count(ext)==1 else 'alt-'+winner['row']['sha256'][:10]
   winner['target']=str(p.with_name(add_qualifier(p.stem,qualifier)+p.suffix))
 def choose_cover(row):
  p=Path(row['path']);base=p.parent.parent/'compress';ext=p.suffix.lstrip('.').lower()
  explicit=[str(base/(p.stem+'-src-'+ext+'.webp'))]
  actual=(row.get('detected_extension') or '').lstrip('.')
  if actual and actual!=ext:explicit.append(str(base/(p.stem+'-src-'+actual+'.webp')))
  for candidate in explicit:
   if candidate in by_path:return by_path[candidate],'source-extension-cover'
  raw_group=source_stems[(str(p.parent),p.stem.casefold())]
  if len({r['sha256'] for r in raw_group})>1:return None,'ambiguous-source-stem'
  for ext in ['.webp','.png','.jpg','.jpeg']:
   candidate=str(base/(p.stem+ext))
   if candidate in by_path:return by_path[candidate],'exact-source-stem'
  return None,'missing-local-cover'
 for row in origins:
  cover,evidence=choose_cover(row)
  if cover:cover_associations[cover['path']].append(row['path'])
 for winner in winners:
  row=winner['row'];cover,evidence=choose_cover(row)
  if cover is None:
   # An identical original in a second legacy directory can supply its preview.
   for alternative in winner['group'][1:]:
    candidate,alternative_evidence=choose_cover(alternative)
    if candidate:cover=candidate;evidence='identical-original-'+alternative_evidence;break
  if cover is None and root is not None and out is not None and media_of(row)=='static':
   from PIL import Image,ImageOps
   generated=Path(out)/'generated-covers'/(row['sha256']+'.webp');generated.parent.mkdir(parents=True,exist_ok=True)
   if not generated.exists():
    with Image.open(Path(root)/row['path']) as image:
     image=ImageOps.exif_transpose(image);image=image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
     if image.width>700:image=image.resize((700,max(1,round(image.height*700/image.width))),Image.Resampling.LANCZOS)
     image.save(generated,format='WEBP',quality=82,method=6)
     if generated.stat().st_size>100*1024:image.save(generated,format='WEBP',quality=70,method=6)
   cover={'path':'_catalog-generated/'+row['sha256']+'.webp','absolute_path':str(generated.resolve()),'size':generated.stat().st_size,'sha256':digest(generated),'md5':digest(generated,'md5'),'detected_extension':'.webp','derived_from':row['path'],'original_sha256':row['sha256']}
   evidence='generated-from-original-'+evidence;report['generated_covers'].append(cover)
  p=Path(winner['target']);collection,_=collection_role(winner['target']);cover_target=str(Path(collection)/'compress'/(p.stem+'.webp')) if cover else None
  pair={'origin':row,'origin_target':winner['target'],'cover':cover,'cover_target':cover_target,'evidence':evidence}
  for original in winner['group']:
   pairs[original['path']]=pair
   if original['path']!=row['path']:duplicate_origins[original['path']]=winner['target']
  if cover:report['cover_pairings'].append({'original':row['path'],'original_sha256':row['sha256'],'target':winner['target'],'cover':cover['path'],'cover_sha256':cover['sha256'],'cover_target':cover_target,'evidence':evidence})
  else:report['unresolved_covers'].append({'original':row['path'],'reason':evidence})
 return pairs,duplicate_origins,report

PAIR_STATE={}
def local_plan(rows,root=None,out=None):
 moves=[];issues=[];occupied={};by_path={r['path']:r for r in rows};pairs,duplicates,report=local_pairs(rows,root,out)
 PAIR_STATE.clear();PAIR_STATE.update({'pairs':pairs,'report':report})
 cover_targets=collections.defaultdict(set);cover_rows={};original_targets={}
 for original,pair in pairs.items():
  original_targets[original]=pair['origin_target']
  if pair['cover']:
   cover=pair['cover'];cover_rows[cover['path']]=cover;cover_targets[cover['path']].add(pair['cover_target'])
 # Reserve every original and paired-cover destination before handling orphans.
 for old,target in original_targets.items():
  if old not in duplicates:occupied[target.casefold()]=by_path[old]['sha256']
 for old,targets in cover_targets.items():
  for target in targets:
   previous=occupied.get(target.casefold())
   if previous and previous!=cover_rows[old]['sha256']:raise ValueError('Paired cover target has different bytes: '+target)
   occupied[target.casefold()]=cover_rows[old]['sha256']
 used_cover_hashes=collections.defaultdict(list)
 for old,targets in cover_targets.items():
  row=cover_rows[old]
  for target in targets:used_cover_hashes[(collection_role(target)[0],row['sha256'])].append(target)
 for row in sorted(rows,key=lambda r:(r['path']!=normalize_path(r['path']),r['path'])):
  old=row['path'];target=normalize_path(old);role=role_of(row)
  if old.casefold().startswith('huawei matepad/'):
   moves.append({**row,'target':None,'action':'quarantine-matepad'});continue
  if old in duplicates:
   moves.append({**row,'target':duplicates[old],'action':'quarantine-duplicate'});continue
  if old in original_targets:
   target=original_targets[old]
  elif old in cover_targets:
   targets=sorted(cover_targets[old])
   if len(targets)>1 or targets[0]!=old:
    for index,target in enumerate(targets):moves.append({**row,'target':target,'action':'move' if index==0 else 'clone-pair'})
   continue
  else:
   collection,_=collection_role(target)
   # Only unowned covers may deduplicate by bytes. Each surviving original's
   # chosen cover was reserved above and never enters this branch.
   if role=='compress' and (collection,row['sha256']) in used_cover_hashes:
    moves.append({**row,'target':used_cover_hashes[(collection,row['sha256'])][0],'action':'quarantine-duplicate'});continue
   if target.casefold() in occupied:
    p=Path(target);target=str(p.with_name(add_qualifier(p.stem,'alt-'+row['sha256'][:10])+p.suffix))
   if target.casefold() in occupied:raise ValueError('Unresolved unique target collision: '+target)
   occupied[target.casefold()]=row['sha256']
   if role=='compress':used_cover_hashes[(collection,row['sha256'])].append(target)
  if old!=target:moves.append({**row,'target':target,'action':'move'})
 for old,row in cover_rows.items():
  if row.get('absolute_path'):
   for target in sorted(cover_targets[old]):moves.append({**row,'target':target,'action':'install-generated-cover'})
 return moves,issues

def sql_quote(v):
 if v is None:return 'NULL'
 if isinstance(v,(int,float)):return str(v)
 return "'"+str(v).replace("'","''")+"'"

def row_where(row):return ' AND '.join(f'"{k}" IS {sql_quote(v)}' for k,v in row.items())
def update_sql(table,before,after):
 changed={k:v for k,v in after.items() if before[k]!=v}
 if not changed:return None
 return 'UPDATE '+table+' SET '+','.join(f'"{k}"={sql_quote(v)}' for k,v in changed.items())+' WHERE '+row_where(before)+';'
def insert_sql(table,row):return 'INSERT INTO '+table+' ('+','.join('"'+k+'"' for k in row)+') VALUES ('+','.join(sql_quote(v) for v in row.values())+');'

def device_merges(db):
 groups=collections.defaultdict(list)
 for row in db.execute('SELECT * FROM w_devices ORDER BY create_date,id'):
  d=dict(row);groups[(d['brand_name'],normalize_label(d['device_name']).casefold())].append(d)
 merges={};aliases=[]
 for rows in groups.values():
  if len(rows)<2:continue
  rows.sort(key=lambda d:(bool(re.search(r'-\d+$',d['device_slug'])),d['create_date'],d['id']))
  winner=rows[0]
  for loser in rows[1:]:
   merges[loser['id']]=winner['id'];aliases.append({'brand':loser['brand_name'],'old_slug':loser['device_slug'],'new_slug':winner['device_slug'],'old_id':loser['id'],'new_id':winner['id']})
 return merges,aliases

def configure_prefixes(db):
 devices={d['id']:dict(d) for d in db.execute('SELECT * FROM w_devices')};merges,_=device_merges(db)
 PREFIX_OVERRIDES.clear()
 for w in db.execute('SELECT device_id,origin_key,compress_key FROM w_wallpapers'):
  d=devices[merges.get(w['device_id'],w['device_id'])]
  for f in ['origin_key','compress_key']:
   if not w[f]:continue
   parts=Path(w[f]).parts
   for i,x in enumerate(parts):
    if x.lower() in ('origin','compress'):
     old_prefix='/'.join(parts[:i]);target=('desktopwalls/' if d['device_category']=='desktop' else '')+d['brand_name']+'/'+normalize_label(d['device_name'])
     PREFIX_OVERRIDES[old_prefix]=target
     if old_prefix.startswith('live/'):PREFIX_OVERRIDES['Live/'+old_prefix[len('live/'):]]=target
     break
 return merges

def remote_plan(db,inventory,moves):
 inventory_by_path={r['path']:r for r in inventory}; move_by_path={r['path']:r for r in moves}
 # The known historical namespace is `live` in D1/R2 and `Live` locally.
 # Alias this exact root only; arbitrary path segments remain case sensitive.
 for row in inventory:
  if row['path'].startswith('Live/'):inventory_by_path.setdefault('live/'+row['path'][5:],row)
 for row in moves:
  if row['path'].startswith('Live/'):move_by_path.setdefault('live/'+row['path'][5:],row)
 devices=[dict(x) for x in db.execute('SELECT * FROM w_devices ORDER BY id')]
 walls=[dict(x) for x in db.execute('SELECT * FROM w_wallpapers ORDER BY id')]
 changes=[];objects={};origin_operations={};issues=[];merges,aliases=device_merges(db);timestamp=int(time.time()*1000)
 def add_object(source,target,role,local,reason,**extra):
  key=(source,target,local['sha256'] if local else None)
  value={'source':source,'target':target,'role':role,'local':local,'reason':reason,**extra}
  previous=objects.get(key)
  if previous and not previous.get('optional'):value['optional']=False
  objects[key]=value
  return value
 def remote_local_key(path):return 'live/'+path[5:] if path.startswith('Live/') else path
 removed_ids={d['id'] for d in devices if d['brand_name']=='huawei-matepad'}
 # Full original content equality within one D1 device/media group. Never merge real device identities heuristically.
 duplicate_groups=collections.defaultdict(list)
 for w in walls:
  local=inventory_by_path.get(w['origin_key'])
  if local and w['device_id'] not in removed_ids:duplicate_groups[(merges.get(w['device_id'],w['device_id']),w['media_type'],local['sha256'])].append(w)
 duplicate_winners={};retained_wallpaper_fields={}
 for group in duplicate_groups.values():
  if len(group)<2:continue
  group.sort(key=lambda w:(w['device_id'] in merges,w['status']!='published',not w['is_primary'],w['create_date'],w['id']))
  winner=group[0];tags=[]
  for item in group:
   for tag in json.loads(item['tags'] or '[]'):
    if tag not in tags:tags.append(tag)
  retained_wallpaper_fields[winner['id']]={'status':'published' if any(x['status']=='published' for x in group) else winner['status'],'is_primary':int(any(x['is_primary'] for x in group)),'tags':json.dumps(tags,ensure_ascii=False,separators=(',',':'))}
  for w in group[1:]:duplicate_winners[w['id']]=winner['id']
 primary_groups=collections.defaultdict(list)
 for original in walls:
  w={**original,**retained_wallpaper_fields.get(original['id'],{})}
  if w['id'] not in duplicate_winners and w['device_id'] not in removed_ids and w['is_primary']:
   primary_groups[(merges.get(w['device_id'],w['device_id']),w['category'],w['media_type'])].append(w)
 demote=set()
 for group in primary_groups.values():
  group.sort(key=lambda w:(w['device_id'] in merges,w['status']!='published',w['create_date'],w['id']))
  demote.update(w['id'] for w in group[1:])
 for d in devices:
  if d['id'] in removed_ids:
   for table in ['w_device_i18n','w_live_device_i18n']:
    for row in db.execute('SELECT * FROM '+table+' WHERE device_id=?',(d['id'],)):
     changes.append({'table':table,'before':dict(row),'after':None,'reason':'remove-matepad'})
   continue
  if d['id'] in merges:
   winner=merges[d['id']]
   for table in ['w_device_i18n','w_live_device_i18n']:
    for row in db.execute('SELECT * FROM '+table+' WHERE device_id=?',(d['id'],)):
     before=dict(row);existing=db.execute('SELECT * FROM '+table+' WHERE device_id=? AND language=?',(winner,row['language'])).fetchone()
     if existing:
      retained=dict(existing);filled=dict(existing);conflicts={}
      for field in ['display_name','seo_title','description']:
       if not filled[field] and before[field]:filled[field]=before[field]
       elif filled[field] and before[field] and filled[field]!=before[field]:conflicts[field]={'retained':filled[field],'alternative':before[field]}
      if filled!=retained:
       filled['updated_date']=timestamp;changes.append({'table':table,'before':retained,'after':filled,'reason':'fill-merged-translation-blanks'})
      changes.append({'table':table,'before':before,'after':None,'reason':'merge-duplicate-device-text','retained_text':retained,'editorial_conflicts':conflicts})
     else:changes.append({'table':table,'before':before,'after':{**before,'device_id':winner,'updated_date':timestamp},'reason':'preserve-unique-translation'})
   continue
  name=normalize_label(d['device_name'])
  merged_published=any(item['status']=='published' for item in devices if merges.get(item['id'])==d['id'])
  if name!=d['device_name'] or (merged_published and d['status']!='published'):
   after={**d,'device_name':name,'name_key':name.lower(),'updated_date':timestamp}
   if merged_published:after['status']='published'
   changes.append({'table':'w_devices','before':d,'after':after,'reason':'normalize-display-name','slug_preserved':True})
   for table in ['w_device_i18n','w_live_device_i18n']:
    for row in db.execute('SELECT * FROM '+table+' WHERE device_id=?',(d['id'],)):
     before=dict(row);after=dict(row)
     for field in ['display_name','seo_title','description']:
      if after[field]:after[field]=normalize_editorial(after[field],d['device_name'],name)
     if before!=after:
      after['updated_date']=timestamp;changes.append({'table':table,'before':before,'after':after,'reason':'normalize-editorial-name-literal-only'})
 for w in walls:
  if w['device_id'] in removed_ids or w['id'] in duplicate_winners:
   changes.append({'table':'w_wallpapers','before':w,'after':None,'reason':'remove-matepad' if w['device_id'] in removed_ids else 'duplicate-original','winner_id':duplicate_winners.get(w['id'])})
   for field in ['origin_key','compress_key']:
    if w[field]:
     operation=add_object(w[field],None,field,inventory_by_path.get(w[field]),'quarantine')
     if field=='origin_key':origin_operations[w['id']]=operation
   continue
  after={**w,**retained_wallpaper_fields.get(w['id'],{}),'device_id':merges.get(w['device_id'],w['device_id'])}
  if w['id'] in demote:after['is_primary']=0
  local=inventory_by_path.get(w['origin_key']);pair=PAIR_STATE.get('pairs',{}).get(local['path']) if local else None
  if pair:
   after['origin_key']=pair['origin_target']
   if pair['cover']:
    after['compress_key']=pair['cover_target'];cover=pair['cover'];cover_source=remote_local_key(cover['path'])
    if after['compress_key']!=w['compress_key'] or cover_source!=w['compress_key']:
     add_object(cover_source,after['compress_key'],'compress_key',cover,'repair-original-cover-pair',mime_type='image/webp',legacy_reference=w['compress_key'],pair_evidence=pair['evidence'])
     if w['compress_key'] and w['compress_key']!=cover_source:
      add_object(w['compress_key'],None,'legacy_cover',inventory_by_path.get(w['compress_key']),'replaced-cover-reference',optional=True)
  else:
   for field in ['origin_key','compress_key']:
    key=w[field]
    if not key:continue
    localmove=move_by_path.get(key);after[field]=localmove['target'] if localmove else normalize_path(key)
    if after[field]!=key and field=='compress_key':add_object(key,after[field],field,inventory_by_path.get(key),'rename')
  if local and local.get('detected_extension'):
   actual=local['detected_extension'];after['mime_type']={'.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.bmp':'image/bmp'}[actual]
   after['file_format']=Path(after['origin_key']).suffix.lstrip('.')
  if after['origin_key']!=w['origin_key'] or after['mime_type']!=w['mime_type']:
   origin_operations[w['id']]=add_object(w['origin_key'],after['origin_key'],'origin_key',local,'normalize-original-pair',mime_type=after['mime_type'])
  after['name']=Path(after['origin_key']).stem
  if after!=w:
   after['updated_date']=timestamp;changes.append({'table':'w_wallpapers','before':w,'after':after,'reason':'normalize-asset-name-key'})
 for d in devices:
  if d['id'] in removed_ids or d['id'] in merges:changes.append({'table':'w_devices','before':d,'after':None,'reason':'remove-matepad' if d['id'] in removed_ids else 'merge-duplicate-device'})
 # Shared object keys must stay available if any surviving record still references them.
 surviving=[c['after'] for c in changes if c['table']=='w_wallpapers' and c['after']]
 changed_ids={c['before']['id'] for c in changes if c['table']=='w_wallpapers'}
 surviving.extend(w for w in walls if w['id'] not in changed_ids)
 referenced={w[f] for w in surviving for f in ['origin_key','compress_key'] if w[f]}
 # Derived legacy video previews are optional, but must follow moved dynamic originals.
 for w in walls:
  if w['media_type']!='dynamic' or '/origin/' not in w['origin_key']:continue
  origin=origin_operations.get(w['id'])
  if origin:
   key=w['origin_key'].replace('/origin/','/preview/')
   target=origin['target'].replace('/origin/','/preview/') if origin['target'] else None
   add_object(key,target,'video_preview',inventory_by_path.get(key),origin['reason'],optional=True)
 for obj in objects.values():obj['retain_source']=obj['source'] in referenced
 # Combine blank filling and display normalization into one guarded row update.
 combined={};ordered=[]
 for change in changes:
  key=(change['table'],change['before']['id'])
  if change['after'] is not None and key in combined:
   previous=combined[key]
   for field,value in change['after'].items():
    if value!=change['before'][field]:previous['after'][field]=value
  else:
   ordered.append(change)
   if change['after'] is not None:combined[key]=change
 changes=ordered
 changes.sort(key=lambda c: (4 if c['table']=='w_devices' and c['after'] is not None else 3 if c['table']=='w_devices' else 0 if c['after'] is None else 2 if c['table']=='w_wallpapers' and c['before']['device_id']!=c['after']['device_id'] else 1))
 return changes,list(objects.values()),issues

def build_sql(changes):
 apply=[];rollback=[]
 for c in changes:
  table,before,after=c['table'],c['before'],c['after']
  if after:
   apply.append(update_sql(table,before,after));rollback.insert(0,update_sql(table,after,before))
  else:
   apply.append('DELETE FROM '+table+' WHERE '+row_where(before)+';')
   rollback.insert(0,insert_sql(table,before))
 return '\n'.join(x for x in apply if x)+'\n','\n'.join(x for x in rollback if x)+'\n'

def audit(args):
 root=Path(args.source).resolve();out=Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True)
 cache=out/'inventory.json';paths=[]
 for base,dirs,files in os.walk(root):
  dirs[:]=[d for d in dirs if not d.startswith('.')]
  paths.extend(Path(base)/f for f in files if not f.startswith('.') and Path(f).suffix.lower() in MEDIA)
 if cache.exists() and not args.rehash:
  inventory=json.loads(cache.read_text())
  if len(inventory)!=len(paths) or any(not (root/r['path']).exists() or (root/r['path']).stat().st_size!=r['size'] for r in inventory):raise ValueError('Inventory is stale; use --rehash')
 else:
  with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:inventory=list(pool.map(lambda p:inventory_file(root,p),sorted(paths)))
  cache.write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n')
 for row in inventory:
  if 'detected_extension' not in row:row['detected_extension']=detected_extension(root/row['path'])
  if row['detected_extension']:
   FORMAT_OVERRIDES[row['path']]=row['detected_extension']
   if row['path'].startswith('Live/'):FORMAT_OVERRIDES['live/'+row['path'][5:]]=row['detected_extension']
 cache.write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n')
 db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row;db.executescript(Path(args.snapshot).read_text());db.execute('PRAGMA foreign_keys=ON')
 configure_prefixes(db)
 moves,issues=local_plan(inventory,root,out);changes,objects,remote_issues=remote_plan(db,inventory,moves)
 apply,rollback=build_sql(changes)
 tables=['w_devices','w_wallpapers','w_device_i18n','w_live_device_i18n']
 def state():return {t:[dict(r) for r in db.execute('SELECT * FROM '+t+' ORDER BY id')] for t in tables}
 original=state();db.executescript(apply);after=state();db.executescript(apply)
 if after!=state():raise ValueError('Apply is not idempotent')
 db.executescript(rollback)
 if original!=state():raise ValueError('Rollback did not restore exact source rows')
 summary={'files':len(inventory),'bytes':sum(x['size'] for x in inventory),'format_extension_mismatches':sum(bool(x.get('detected_extension')) and Path(x['path']).suffix.lower()!=x['detected_extension'] and not (x['detected_extension']=='.jpg' and Path(x['path']).suffix.lower()=='.jpeg') for x in inventory),'local_actions':dict(collections.Counter(x['action'] for x in moves)),'remote_changes':dict(collections.Counter(x['table'] for x in changes)),'r2_objects':len(objects),'r2_no_local_evidence':sum(x['local'] is None for x in objects),'issues':issues+remote_issues,'d1_simulation':'apply + idempotent repeat + exact rollback passed'}
 manifest={'version':1,'source':str(root),'snapshot':str(Path(args.snapshot).resolve()),'snapshot_sha256':digest(args.snapshot),'summary':summary,'local_actions':moves,'pairing_audit':PAIR_STATE['report'],'d1_changes':changes,'r2_objects':objects,'aliases':device_merges(db)[1],'rollback_strategy':'R2 verified copies under backup prefix; no old object deletion until D1 readback and full referenced-key check. Local files copied and SHA256 verified in quarantine before moves. D1 rollback guards renamed rows and restores removed rows. Stable device slugs unchanged.'}
 (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 (out/'apply.sql').write_text(apply);(out/'rollback.sql').write_text(rollback)
 print(json.dumps(summary,ensure_ascii=False,indent=2))

def local_event(quarantine,event):
 path=Path(quarantine)/'local-operations.jsonl'
 with path.open('a') as stream:
  stream.write(json.dumps(event,ensure_ascii=False)+'\n');stream.flush();os.fsync(stream.fileno())

def actual_directory(parent,name):
 # Exact spelling wins on case-sensitive volumes. Only samefile aliases may
 # change spelling; similarly named distinct directories never merge here.
 desired=parent/name
 for child in parent.iterdir():
  if child.name==name:
   if not child.is_dir() or child.is_symlink():raise ValueError('Occupied directory target '+str(desired))
   return child
 if not desired.exists():return None
 for child in parent.iterdir():
  if child.name.casefold()==name.casefold() and child.is_dir() and not child.is_symlink() and os.path.samefile(child,desired):return child
 raise ValueError('Unresolved directory alias '+str(desired))

def case_directory(root,old,new,quarantine):
 if old.name==new.name:return
 if not os.path.samefile(old,new):raise ValueError('Case normalization cannot replace a distinct directory')
 relative_old=str(old.relative_to(root));relative_new=str(new.relative_to(root));identity=old.stat()
 temporary=old.parent/('.catalog-case-'+hashlib.sha256((relative_old+'\0'+relative_new).encode()).hexdigest()[:16])
 if temporary.exists():raise ValueError('Occupied temporary case directory '+str(temporary))
 event={'kind':'case-directory','old':relative_old,'new':relative_new,'temporary':str(temporary.relative_to(root)),'device':identity.st_dev,'inode':identity.st_ino}
 local_event(quarantine,event)
 os.rename(old,temporary)
 if new.exists():raise ValueError('Directory target appeared during case normalization '+str(new))
 os.rename(temporary,new)

def recover_pending_case_directories(root,quarantine):
 journal=quarantine/'local-operations.jsonl'
 if not journal.exists():return
 for line in journal.read_text().splitlines():
  event=json.loads(line)
  if event.get('kind')!='case-directory':continue
  temporary=root/event['temporary'];target=root/event['new']
  if not temporary.exists():continue
  identity=temporary.stat()
  if identity.st_dev!=event['device'] or identity.st_ino!=event['inode']:raise ValueError('Temporary directory identity changed')
  if target.exists():raise ValueError('Distinct directory occupies pending case target '+event['new'])
  os.rename(temporary,target)

def normalize_parent_cases(root,actions,quarantine):
 parents={str(Path(a['target']).parent) for a in actions if a.get('target') and a['action'] in ('move','clone-pair','install-generated-cover')}
 for relative in sorted(parents,key=lambda p:(len(Path(p).parts),p)):
  parent=root
  for name in Path(relative).parts:
   if name in ('','.'):continue
   current=actual_directory(parent,name)
   if current is None:(parent/name).mkdir()
   elif current.name!=name:case_directory(root,current,parent/name,quarantine)
   parent=parent/name

def retire_local_directory(root,directory,quarantine):
 directories=[directory]+[p for p in directory.rglob('*') if p.is_dir()]
 files=[p for p in directory.rglob('*') if not p.is_dir()]
 if any(p.is_symlink() for p in directories+files):raise ValueError('Retiring a directory containing symlinks requires a separate manifest')
 records=[]
 for path in files:
  record={'path':str(path.relative_to(root)),'sha256':digest(path)};backup=quarantine/record['path']
  if backup.exists() and (not backup.is_file() or digest(backup)!=record['sha256']):raise ValueError('Occupied metadata quarantine '+record['path'])
  records.append(record)
 local_event(quarantine,{'kind':'retired-directory','path':str(directory.relative_to(root)),'directories':[str(p.relative_to(root)) for p in directories],'files':records})
 for record in records:
  path=root/record['path'];backup=quarantine/record['path'];backup.parent.mkdir(parents=True,exist_ok=True)
  if backup.exists():path.unlink()
  else:os.replace(path,backup)
 for path in sorted(directories,key=lambda p:-len(p.parts)):path.rmdir()

def restore_local_events(root,quarantine):
 journal=quarantine/'local-operations.jsonl'
 if not journal.exists():return
 events=[json.loads(line) for line in journal.read_text().splitlines() if line]
 # Restore retired metadata/notes while canonical parents still resolve, then
 # reverse child case changes before their parent changes.
 for event in reversed(events):
  if event['kind'] in ('retired-directory','retired-files'):
   for relative in sorted(event.get('directories',[]),key=lambda p:len(Path(p).parts)):(root/relative).mkdir(parents=True,exist_ok=True)
   for record in event['files']:
    backup=quarantine/record['path'];target=root/record['path']
    if not backup.exists() or digest(backup)!=record['sha256']:raise ValueError('Changed retired metadata '+record['path'])
    if target.exists() and digest(target)!=record['sha256']:raise ValueError('Occupied restored metadata '+record['path'])
    if not target.exists():clone_copy(backup,target)
  elif event['kind']=='case-directory':
   old=root/event['old'];new=root/event['new'];temporary=root/event['temporary']
   found=None
   for candidate in [temporary,new,old]:
    if candidate.exists():
     stat=candidate.stat()
     if stat.st_dev==event['device'] and stat.st_ino==event['inode']:found=candidate;break
   if found is None:raise ValueError('Case directory identity changed '+event['new'])
   # Paths can resolve as aliases; inspect the parent's stored entry spelling.
   actual=next((p for p in found.parent.iterdir() if p.is_dir() and p.stat().st_dev==event['device'] and p.stat().st_ino==event['inode']),None)
   if actual is None:raise ValueError('Case directory entry missing '+event['new'])
   if actual.name==old.name:continue
   if old.exists() and not os.path.samefile(actual,old):raise ValueError('Distinct directory occupies rollback spelling '+event['old'])
   temp=actual.parent/('.catalog-rollback-case-'+hashlib.sha256(event['old'].encode()).hexdigest()[:16])
   if temp.exists():raise ValueError('Occupied rollback case temporary')
   os.rename(actual,temp)
   if old.exists():raise ValueError('Rollback case target appeared '+event['old'])
   os.rename(temp,old)

def rollback_authoritative_cover_events(root,quarantine):
 journal=quarantine/'local-operations.jsonl'
 if not journal.exists():return
 for line in reversed(journal.read_text().splitlines()):
  event=json.loads(line)
  if event.get('kind')!='authoritative-cover-install':continue
  target=root/event['target'];backup=quarantine/event['backup_path']
  install_temporary=target.parent/('.catalog-cover-'+event['after_sha256'][:16])
  if install_temporary.exists():
   if digest(install_temporary)!=event['after_sha256']:raise ValueError('Changed cover install temporary')
   install_temporary.unlink()
  if not target.exists():continue
  current=digest(target)
  if current==event['before_sha256']:continue
  if current!=event['after_sha256']:raise ValueError('Authoritative local cover changed after reconciliation '+event['target'])
  if not backup.exists() or digest(backup)!=event['before_sha256']:raise ValueError('Authoritative cover rollback copy changed')
  temporary=target.parent/('.catalog-cover-rollback-'+event['before_sha256'][:16])
  if temporary.exists():
   if digest(temporary)!=event['before_sha256']:raise ValueError('Occupied cover rollback temporary')
  else:clone_copy(backup,temporary)
  os.replace(temporary,target)

def mirror_cover_overlay(args):
 manifest=json.loads(Path(args.manifest).read_text());overlay=json.loads(Path(args.overlay).read_text());root=Path(manifest['source']);quarantine=Path(args.quarantine).resolve()
 if overlay['manifest_sha256']!=digest(args.manifest) or overlay.get('errors'):raise ValueError('Cover overlay is not verified for this frozen manifest')
 expected={(row['source'],row['target']):row for row in manifest['r2_objects'] if row['role']=='compress_key'}
 # Complete verification before changing any served local file.
 for entry in overlay['entries']:
  if (entry['source'],entry['target']) not in expected or entry['role']!='compress_key':raise ValueError('Overlay attempts to replace an original')
  staged=Path(entry['local']['absolute_path']);target=root/entry['target'];before=expected[(entry['source'],entry['target'])]['local']
  if not before:raise ValueError('Overlay has no frozen local cover to preserve')
  if not staged.exists() or digest(staged)!=entry['local']['sha256'] or detected_extension(staged)!='.webp':raise ValueError('Staged authoritative cover changed')
  if not target.exists() or digest(target) not in (before['sha256'],entry['local']['sha256']):raise ValueError('Canonical local cover differs from frozen apply result '+entry['target'])
 for entry in overlay['entries']:
  staged=Path(entry['local']['absolute_path']);target=root/entry['target'];before=expected[(entry['source'],entry['target'])]['local'];after_hash=entry['local']['sha256']
  if digest(target)==after_hash:continue
  relative_backup='_overlay-before/'+entry['target'];backup=quarantine/relative_backup;backup.parent.mkdir(parents=True,exist_ok=True)
  if not backup.exists():clone_copy(target,backup)
  if digest(backup)!=before['sha256']:raise ValueError('Occupied authoritative cover backup')
  event={'kind':'authoritative-cover-install','target':entry['target'],'before_sha256':before['sha256'],'after_sha256':after_hash,'backup_path':relative_backup,'overlay_sha256':digest(args.overlay)}
  local_event(quarantine,event)
  temporary=target.parent/('.catalog-cover-'+after_hash[:16])
  if temporary.exists():raise ValueError('Occupied cover install temporary')
  clone_copy(staged,temporary);os.replace(temporary,target)
 print(json.dumps({'mirrored_authoritative_covers':len(overlay['entries']),'overlay_sha256':digest(args.overlay)}))

def local_apply(args):
 manifest=json.loads(Path(args.manifest).read_text());root=Path(manifest['source']);quarantine=Path(args.quarantine).resolve();quarantine.mkdir(parents=True,exist_ok=True)
 if quarantine==root or root in quarantine.parents:raise ValueError('Quarantine must be outside the served source tree')
 actions=manifest['local_actions']
 recover_pending_case_directories(root,quarantine)
 if root.stat().st_dev!=quarantine.stat().st_dev:raise ValueError('Use a quarantine on the source volume for atomic moves and APFS clones')
 # Verify every affected file before the first write. Move into quarantine, then
 # clone normalized targets: retained copies use no additional media blocks.
 for a in actions:
  old=Path(a['absolute_path']) if a.get('absolute_path') else root/a['path'];backup=quarantine/a['path']
  candidate=old if old.exists() else backup
  if not candidate.exists() or digest(candidate)!=a['sha256']:raise ValueError('Missing or changed original '+a['path'])
  if backup.exists() and digest(backup)!=a['sha256']:raise ValueError('Occupied backup '+a['path'])
 for a in actions:
  old=root/a['path'];backup=quarantine/a['path'];backup.parent.mkdir(parents=True,exist_ok=True)
  if a.get('absolute_path'):
   if not backup.exists():clone_copy(a['absolute_path'],backup)
  elif old.exists():
   if backup.exists():old.unlink()
   else:os.replace(old,backup)
 normalize_parent_cases(root,actions,quarantine)
 for a in actions:
  if a['action'] not in ('move','clone-pair','install-generated-cover'):continue
  target=root/a['target'];target.parent.mkdir(parents=True,exist_ok=True)
  if not target.exists():clone_copy(quarantine/a['path'],target)
  if digest(target)!=a['sha256']:raise ValueError('Target mismatch '+a['target'])
 # Quarantine Finder metadata from emptied affected legacy directories.
 affected_parents={str(parent).casefold() for a in actions if not a.get('absolute_path') for parent in Path(a['path']).parents if str(parent)!='.'}
 for base,dirs,files in os.walk(root,topdown=False):
  directory=Path(base)
  if directory==root or any(p.startswith('.') for p in directory.relative_to(root).parts):continue
  if str(directory.relative_to(root)).casefold() not in affected_parents:continue
  if all(p.name.startswith('.') for p in directory.iterdir()):retire_local_directory(root,directory,quarantine)
 # The explicitly removed brand includes notes and all hidden metadata.
 if any(a['action']=='quarantine-matepad' for a in actions):
  for directory in list(root.iterdir()):
   if directory.is_dir() and directory.name.casefold()=='huawei matepad':retire_local_directory(root,directory,quarantine)
   elif directory.is_file() and directory.name.casefold()=='._huawei matepad':
    record={'path':directory.name,'sha256':digest(directory)};backup=quarantine/directory.name
    if backup.exists() and digest(backup)!=record['sha256']:raise ValueError('Occupied MatePad sidecar quarantine')
    local_event(quarantine,{'kind':'retired-files','files':[record]})
    if backup.exists():directory.unlink()
    else:os.replace(directory,backup)

 (quarantine/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'verified_local_actions':len(actions),'quarantine':str(quarantine)}))

def local_rollback(args):
 manifest=json.loads(Path(args.manifest).read_text());root=Path(manifest['source']);quarantine=Path(args.quarantine).resolve()
 recover_pending_case_directories(root,quarantine)
 rollback_authoritative_cover_events(root,quarantine)
 for a in manifest['local_actions']:
  backup=quarantine/a['path']
  if not backup.exists() or digest(backup)!=a['sha256']:raise ValueError('Changed quarantine file '+a['path'])
  if a['action'] in ('move','clone-pair','install-generated-cover'):
   target=root/a['target']
   if target.exists() and digest(target)!=a['sha256']:raise ValueError('Changed normalized file '+a['target'])
 for a in manifest['local_actions']:
  if a['action'] in ('move','clone-pair','install-generated-cover'):
   target=root/a['target']
   if target.exists():target.unlink()
 for a in manifest['local_actions']:
  if a.get('absolute_path'):continue
  old=root/a['path'];old.parent.mkdir(parents=True,exist_ok=True)
  if old.exists() and digest(old)!=a['sha256']:raise ValueError('Occupied original path '+a['path'])
  if not old.exists():clone_copy(quarantine/a['path'],old)
 restore_local_events(root,quarantine)
 print(json.dumps({'restored_local_files':len(manifest['local_actions'])}))

def verify_d1(args):
 manifest=json.loads(Path(args.manifest).read_text());db=sqlite3.connect(':memory:');db.row_factory=sqlite3.Row;db.executescript(Path(args.snapshot).read_text());differences=[]
 for change in manifest['d1_changes']:
  expected=change['before'] if args.phase=='before' else change['after']
  actual=db.execute('SELECT * FROM '+change['table']+' WHERE id=?',(change['before']['id'],)).fetchone()
  if expected is None:
   if actual is not None:differences.append({'table':change['table'],'id':change['before']['id'],'reason':'expected-removed'})
  elif actual is None or any(actual[k]!=v for k,v in expected.items()):differences.append({'table':change['table'],'id':change['before']['id'],'reason':'snapshot-differs'})
 if args.phase=='before':
  baseline=sqlite3.connect(':memory:');baseline.row_factory=sqlite3.Row;baseline.executescript(Path(manifest['snapshot']).read_text())
  removed=[c['before']['id'] for c in manifest['d1_changes'] if c['table']=='w_devices' and c['after'] is None]
  for device_id in removed:
   for table in ['w_wallpapers','w_device_i18n','w_live_device_i18n','w_collection_deletions']:
    def rows(database):return sorted([dict(r) for r in database.execute('SELECT * FROM '+table+' WHERE device_id=?',(device_id,))],key=lambda r:json.dumps(r,sort_keys=True))
    if rows(db)!=rows(baseline):differences.append({'table':table,'device_id':device_id,'reason':'device-child-snapshot-differs'})
 print(json.dumps({'phase':args.phase,'verified_changes':len(manifest['d1_changes']),'differences':differences},ensure_ascii=False,indent=2))
 if differences:raise SystemExit(1)

def main():
 parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='command',required=True)
 a=sub.add_parser('audit');a.add_argument('--source',required=True);a.add_argument('--snapshot',required=True);a.add_argument('--out',required=True);a.add_argument('--rehash',action='store_true')
 for command in ['apply-local','rollback-local']:
  a=sub.add_parser(command);a.add_argument('--manifest',required=True);a.add_argument('--quarantine',required=True)
 a=sub.add_parser('mirror-cover-overlay');a.add_argument('--manifest',required=True);a.add_argument('--overlay',required=True);a.add_argument('--quarantine',required=True)
 a=sub.add_parser('verify-d1');a.add_argument('--manifest',required=True);a.add_argument('--snapshot',required=True);a.add_argument('--phase',choices=['before','after'],required=True)
 args=parser.parse_args();{'mirror-cover-overlay':mirror_cover_overlay,'verify-d1':verify_d1,'audit':audit,'apply-local':local_apply,'rollback-local':local_rollback}[args.command](args)
if __name__=='__main__':main()
