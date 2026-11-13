// Standalone regression check; no additional test framework or server required.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
async function scenario(mode) {
  let charged = 0, reserved = 0, pulls = 0;
  const abort = new AbortController();
  const response = new Response(new ReadableStream({
    pull(controller) {
      if (mode === 'error' && pulls > 0) { controller.error(new Error('upstream failed')); return; }
      if (pulls++ === 0) controller.enqueue(new Uint8Array([1, 2]));
      else controller.close();
    },
  }), { headers: { 'content-length': mode === 'truncated' ? '10' : '2' } });
  const mocks = {
    '@cloudflare/next-on-pages': { getOptionalRequestContext: () => undefined },
    '@/lib/download-quota': {
      getDownloadQuota: async () => ({allowed: true}), downloadRetryAfter: () => 1,
      consumeDownloadQuota: async () => { charged++; return true; },
      reserveDownloadQuota: async () => { reserved++; if (mode === 'abort') abort.abort(); return 'reservation'; },
      settleDownloadQuota: async (_, success) => { if (reserved) { reserved--; if (success) charged++; } },
    },
    '@/lib/api-monitor': { observeApiRequest: (_, operation) => operation() },
    'next/server': { NextResponse: class extends Response { static json(body, init) { return new Response(JSON.stringify(body),init); } } },
    '@/lib/services/r2': { R2Service: class { getPublicFileUrl() { return 'https://example.test/file'; } } },
    '@/lib/config/environments': { getCurrentEnvironment: () => ({r2:{isPrivate:false}}) },
    '@/lib/cache-control': { DOWNLOAD_CACHE_CONTROL: 'no-store' },
    '@/lib/wallpaper-key': { sanitizeWallpaperDownloadKey: (key) => key },
    '@/lib/wallpaper-db': { isPublishedWallpaperKey: async () => true },
  };
  const module = {exports:{}};
  const code = ts.transpileModule(fs.readFileSync('src/lib/wallpaper-download.ts','utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code, { module,exports:module.exports,require:(key)=>mocks[key],
    performance,ReadableStream,Uint8Array,console:{info(){},error(){}},fetch:async()=>response });
  const result = await module.exports.wallpaperDownload({nextUrl:new URL('https://example.test/?key=a/origin/b.png'),headers:new Headers(),signal:abort.signal},'Failed');
  if (mode === 'cancel') { const reader = result.body.getReader(); await reader.read(); await reader.cancel(); }
  else if (mode === 'error' || mode === 'truncated') await assert.rejects(result.arrayBuffer());
  else await result.arrayBuffer();
  assert.equal(charged, mode === 'success' ? 1 : 0, mode+' charge');
  assert.equal(reserved, 0, mode+' reservation released');
}
(async()=>{
  for(const mode of ['success','cancel','error','truncated','abort']) { await scenario(mode); console.log('PASS:',mode); }
})().catch(error=>{console.error(error);process.exitCode=1;});
