import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
function fixture(published = true, upstreamStatus = 206, transientFailures = 0) {
  const calls = [];
  const module = { exports: {} };
  const source = ts.transpileModule(readFileSync(new URL('../src/app/api/files/preview/route.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(source, { module, exports: module.exports, console: { error() {} }, Response, Headers,
    fetch: async (url, options) => { calls.push({ url, options });
      if (calls.length <= transientFailures) throw new TypeError('connection reset');
      return new Response('video', {
      status: upstreamStatus, headers: { 'content-type': 'video/mp4', 'content-range': 'bytes 0-4/200',
        'content-length': '5', 'accept-ranges': 'bytes' },
    }); },
    require(name) {
      if (name === 'next/server') return { NextResponse };
      if (name === '@/lib/wallpaper-key') return { sanitizeWallpaperDownloadKey: (key) => key?.includes('/origin/') && !key.includes('..') ? key : null };
      if (name === '@/lib/wallpaper-db') return { isPublishedWallpaperKey: async () => published };
      if (name === '@/lib/config/environments') return { getCurrentEnvironment: () => ({ r2: { isPrivate: false, urlExpires: 300 } }) };
      if (name === '@/lib/services/r2') return { R2Service: class {
        getPublicFileUrl(key) { return `https://cdn.test/${key}`; }
        async getPrivateFileUrl(key) { return `https://r2.test/${key}?signature=server-only`; }
      } };
      throw new Error(name);
    },
  });
  return { route: module.exports, calls };
}
test('preview forwards byte ranges and serves the browser-compatible preview without attachment', async () => {
  const f = fixture();
  const response = await f.route.GET(new NextRequest('https://phwalls.test/api/files/preview?key=live/Samsung/S25/origin/a.mp4', { headers: { range: 'bytes=0-4' } }));
  assert.equal(response.status, 206);
  assert.equal(response.headers.get('content-range'), 'bytes 0-4/200');
  assert.equal(response.headers.get('content-disposition'), null);
  assert.equal(f.calls[0].url, 'https://r2.test/live/Samsung/S25/preview/a.mp4?signature=server-only');
  assert.equal(f.calls[0].options.headers.Range, 'bytes=0-4');
  assert.equal(await response.text(), 'video');
  assert.ok(![...response.headers.values()].some((value) => value.includes('signature')));
});
test('preview retries a transient storage connection failure without exposing the signed URL', async () => {
  const f = fixture(true, 206, 1);
  const response = await f.route.GET(new NextRequest('https://phwalls.test/api/files/preview?key=live/B/M/origin/a.mp4', { headers: { range: 'bytes=0-4' } }));
  assert.equal(response.status, 206);
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1].options.headers.Range, 'bytes=0-4');
});
test('failed upstream responses are not cached as video data', async () => {
  const f = fixture(true, 503);
  const response = await f.route.GET(new NextRequest('https://phwalls.test/api/files/preview?key=live/B/M/origin/a.mp4'));
  assert.equal(response.status, 502);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.ok(!JSON.stringify(await response.json()).includes('signature'));
});
test('unpublished media, images and traversal are rejected before accessing storage', async () => {
  for (const [published, key] of [[false,'live/B/M/origin/a.mp4'],[true,'live/B/M/origin/a.jpg'],[true,'live/../M/origin/a.mp4']]) {
    const f = fixture(published);
    assert.equal((await f.route.GET(new NextRequest(`https://phwalls.test/api/files/preview?key=${encodeURIComponent(key)}`))).status, 404);
    assert.equal(f.calls.length, 0);
  }
});
test('upstream 416 and content range reach the player, while malformed ranges are rejected', async () => {
  const f = fixture(true, 416);
  assert.equal((await f.route.GET(new NextRequest('https://phwalls.test/api/files/preview?key=live/B/M/origin/a.mp4', { headers: { range: 'bytes=999-' } }))).status, 416);
  const invalid = fixture();
  assert.equal((await invalid.route.GET(new NextRequest('https://phwalls.test/api/files/preview?key=live/B/M/origin/a.mp4', { headers: { range: 'bytes=0-1,3-4' } }))).status, 416);
  assert.equal(invalid.calls.length, 0);
});
