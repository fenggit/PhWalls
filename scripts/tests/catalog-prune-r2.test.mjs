import assert from 'node:assert/strict';
import { test } from 'node:test';
const api = await import('../catalog-prune-r2.mjs').catch(() => ({}));
const SHA='a'.repeat(64), BACKUP='_catalog-backups/'+ '1'.repeat(16)+'/old/origin/a.jpg';
function fixture() {
 const key='old/origin/a.jpg', target='new/origin/a.jpg';
 const candidate={key,source_etag:'"source"',backup_key:BACKUP,backup_etag:'"backup"',sha256:'b'.repeat(64),size:10,evidence_targets:[target]};
 const manifest={snapshot_sha256:'1'.repeat(64),r2_objects:[{source:key,target}]};
 const evidence={manifest_sha256:SHA,source:key,target,backup:BACKUP,sha256:candidate.sha256,sourceInfo:{etag:candidate.source_etag,size:10},backupInfo:{etag:candidate.backup_etag,size:10},targetInfo:{etag:'"target"',size:10},verifiedAt:'2026-10-26T00:00:00Z'};
 const plan={version:1,manifest_sha256:SHA,created_at_ms:1000,candidates:[candidate]};
 const remote={wallpapers:[{origin_key:target,compress_key:null,media_type:'static'}],tombstones:[{object_key:key,deleted_at:1}]};
 const local={wallpapers:[]};const records=[],deletes=[];
 const client={async head(key){return key===BACKUP?{etag:'"backup"',size:10}:{etag:'"source"',size:10};},async delete(key,etag){deletes.push({key,etag});return 204;}};
 return {plan,manifest,manifestSha:SHA,journal:[evidence],remote,local,remoteSnapshotTimeMs:2000,now:2001,client,record:row=>records.push(row),records,deletes};
}
test('prunes only reviewed unreferenced tombstoned exact keys using conditional source ETag',async()=>{
 assert.equal(typeof api.pruneRetiredObjects,'function');const f=fixture();await api.pruneRetiredObjects(f);
 assert.deepEqual(f.deletes,[{key:'old/origin/a.jpg',etag:'"source"'}]);assert.deepEqual(f.records.map(row=>row.event),['delete-intent','deleted']);
});
test('refuses active cover, derived preview, local reference, missing tombstone and stale exports before any delete',async()=>{
 assert.equal(typeof api.pruneRetiredObjects,'function');
 for(const mutate of [f=>f.remote.wallpapers.push({origin_key:'x',compress_key:f.plan.candidates[0].key,media_type:'static'}),f=>{f.plan.candidates[0].key='old/preview/a.mp4';f.remote.wallpapers.push({origin_key:'old/origin/a.mp4',media_type:'dynamic'});},f=>f.local.wallpapers.push({origin_key:f.plan.candidates[0].key,media_type:'static'}),f=>f.remote.tombstones=[],f=>f.remoteSnapshotTimeMs=999]) {
  const f=fixture();mutate(f);await assert.rejects(()=>api.pruneRetiredObjects(f));assert.equal(f.deletes.length,0);
 }
});
test('requires latest current-manifest backup evidence and preserves every manifest fanout target',async()=>{
 assert.equal(typeof api.pruneRetiredObjects,'function');
 for(const mutate of [f=>f.journal.push({...f.journal[0],failed:true}),f=>f.journal[0].manifest_sha256='c'.repeat(64),f=>f.journal[0].backupInfo=null,f=>f.manifest.r2_objects.push({source:'other',target:f.plan.candidates[0].key})]){
  const f=fixture();mutate(f);await assert.rejects(()=>api.pruneRetiredObjects(f));assert.equal(f.deletes.length,0);
 }
});
test('changed source or backup stops deletion and records a durable failure',async()=>{
 assert.equal(typeof api.pruneRetiredObjects,'function');
 for(const changed of ['source','backup']) {const f=fixture();f.client.head=async key=>({etag:key===BACKUP?(changed==='backup'?'changed':'"backup"'):(changed==='source'?'changed':'"source"'),size:10});await assert.rejects(()=>api.pruneRetiredObjects(f));assert.equal(f.deletes.length,0);assert.equal(f.records.at(-1).event,'failed');}
});
test('a lost DELETE response resumes from absent source with backup verified, without deleting twice',async()=>{
 assert.equal(typeof api.pruneRetiredObjects,'function');const f=fixture();let sourcePresent=true;f.client.head=async key=>key===BACKUP?{etag:'"backup"',size:10}:sourcePresent?{etag:'"source"',size:10}:null;
 f.client.delete=async()=>{sourcePresent=false;throw new Error('lost response');};await assert.rejects(()=>api.pruneRetiredObjects(f));
 f.client.delete=async()=>assert.fail('Already absent source must not be deleted again');await api.pruneRetiredObjects(f);assert.equal(f.records.at(-1).event,'already-missing');
});
test('a new local reference after validation and failed conditional DELETE both stop safely',async()=>{
 for(const mode of ['new-reference','conditional-failure']) {
  const f=fixture();let checks=0;
  f.assertLocalUnreferenced=async()=>{if(mode==='new-reference' && ++checks===2)throw new Error('new local reference');};
  if(mode==='conditional-failure')f.client.delete=async()=>412;
  await assert.rejects(()=>api.pruneRetiredObjects(f));assert.ok(!f.records.some(row=>row.event==='deleted'));
  if(mode==='new-reference')assert.equal(f.deletes.length,0);
 }
});
test('durable journals repair an interrupted trailing append and bind each operation to its plan',async()=>{
 const {mkdtempSync,writeFileSync,readFileSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const folder=mkdtempSync(join(tmpdir(),'prune-journal-'));const path=join(folder,'journal.jsonl');
 try {writeFileSync(path,JSON.stringify({event:'delete-intent',plan_sha256:'plan',key:'old'})+'\n{"event":');const journal=api.durablePruneJournal(path);assert.equal(journal.rows.length,1);journal.record({event:'deleted',plan_sha256:'plan',key:'old'});journal.close();assert.equal(api.readJsonJournal(path).length,2);assert.ok(readFileSync(path,'utf8').endsWith('\n'));}
 finally {rmSync(folder,{recursive:true,force:true});}
});
test('R2 DELETE signs If-Match and safely encodes exact keys without logging credentials',async()=>{
 const {createCatalogR2Client}=await import('../lib/catalog-r2-client.mjs');let request;
 const client=createCatalogR2Client({R2_ENDPOINT_PROD:'https://r2.example.test',R2_BUCKET_NAME_PROD:'bucket',R2_ACCESS_KEY_ID_PROD:'test-access',R2_SECRET_ACCESS_KEY_PROD:'test-secret'},async(url,options)=>{request={url,options};return new Response(null,{status:204});});
 assert.equal(await client.delete('Huawei/Old + Name/origin/a#1.jpg','"reviewed"'),204);
 assert.equal(request.url,'https://r2.example.test/bucket/Huawei/Old%20%2B%20Name/origin/a%231.jpg');
 assert.equal(request.options.headers['if-match'],'"reviewed"');assert.match(request.options.headers.authorization,/SignedHeaders=[^,]*if-match/);assert.ok(!request.options.headers.authorization.includes('test-secret'));
});
test('local-authority covers retire verified old remote bytes while preserving a differently sized local target',async()=>{
 const f=fixture(), object=f.manifest.r2_objects[0], proof=f.journal[0];
 object.role='compress_key';object.local={sha256:'c'.repeat(64),size:7};
 f.manifest.r2_objects.push({source:'old/origin/owner.jpg',target:'new/origin/owner.jpg',role:'origin_key',local:{sha256:'e'.repeat(64),size:20}});
 f.manifest.d1_changes=[{table:'w_wallpapers',before:{origin_key:'old/origin/owner.jpg'},after:{compress_key:object.target}}];
 Object.assign(proof,{cover_authority:'local',coverAuthorityOverlaySHA256:'d'.repeat(64),source_sha256:'b'.repeat(64),backup_sha256:'b'.repeat(64),target_sha256:'c'.repeat(64),sha256:'c'.repeat(64),targetInfo:{etag:'"local-target"',size:7},authority_originals:[{source:'old/origin/owner.jpg',sha256:'e'.repeat(64),etag:'"owner"',size:20}]});
 await api.pruneRetiredObjects(f);assert.equal(f.deletes.length,1);
 proof.authority_originals=[];await assert.rejects(()=>api.pruneRetiredObjects(f));assert.equal(f.deletes.length,1);
});
