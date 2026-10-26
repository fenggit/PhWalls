import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCatalogR2Client } from '../lib/catalog-r2-client.mjs';
const env={R2_ENDPOINT_PROD:'https://r2.example.test',R2_BUCKET_NAME_PROD:'bucket',R2_ACCESS_KEY_ID_PROD:'test-access',R2_SECRET_ACCESS_KEY_PROD:'test-secret'};
test('HEAD retries transport errors, rate limits and server failures before returning exact object proof',async()=>{
 let calls=0;
 const client=createCatalogR2Client(env,async()=>{
  calls++;
  if(calls===1)throw new Error('transport');
  if(calls===2)return new Response(null,{status:429});
  if(calls===3)return new Response(null,{status:503});
  return new Response(null,{status:200,headers:{etag:'"reviewed"','content-length':'12','content-type':'image/webp'}});
 });
 assert.deepEqual(await client.head('old/cover.webp'),{etag:'"reviewed"',size:12,mimeType:'image/webp'});assert.equal(calls,4);
});
test('DELETE retries a lost response and server failure with the same signed If-Match, accepting already-absent 404',async()=>{
 const requests=[];
 const client=createCatalogR2Client(env,async(url,options)=>{
  requests.push({url,method:options.method,headers:{...options.headers}});
  if(requests.length===1)throw new Error('lost DELETE response');
  return new Response(null,{status:requests.length===2?502:404});
 });
 assert.equal(await client.delete('old/origin/a.jpg','"source-proof"'),404);assert.equal(requests.length,3);
 assert.ok(requests.every(request=>request.method==='DELETE' && request.headers['if-match']==='"source-proof"' && /SignedHeaders=[^,]*if-match/.test(request.headers.authorization)));
});
test('412, 401 and 403 stop immediately without retries or conditional fallback',async()=>{
 for(const status of [412,401,403]) {
  let calls=0;const client=createCatalogR2Client(env,async()=>{calls++;return new Response(null,{status});});
  await assert.rejects(()=>client.delete('old/origin/a.jpg','"source-proof"'),new RegExp(`HTTP ${status}`));assert.equal(calls,1);
 }
});
test('transient retries remain bounded at four attempts',async()=>{
 let calls=0;const client=createCatalogR2Client(env,async()=>{calls++;return new Response(null,{status:503});});
 await assert.rejects(()=>client.head('old/origin/a.jpg'),/HTTP 503/);assert.equal(calls,4);
});
