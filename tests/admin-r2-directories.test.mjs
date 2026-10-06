import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = fileURLToPath(new URL('../', import.meta.url));

function fixture(xml, status = 200) {
  const path = `${root}src/lib/admin-r2-directories.ts`;
  assert.ok(existsSync(path), 'R2 目录浏览功能尚未实现');
  const requests = [];
  const env = {
    R2_ENDPOINT_PROD: 'https://example.r2.cloudflarestorage.com', R2_BUCKET_NAME_PROD: 'wallpapers',
    R2_ACCESS_KEY_ID_PROD: 'test-access', R2_SECRET_ACCESS_KEY_PROD: 'test-secret',
    ADMIN_SESSION_SECRET: 'test-only-session-secret-with-32-characters',
  };
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const module = { exports: {} };
    cache.set(path, module);
    const source = ts.transpileModule(readFileSync(path, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    runInNewContext(source, {
      module, exports: module.exports, crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob,
      Date, URL, Error, AbortSignal, process: { env: { NODE_ENV: 'production' } },
      async fetch(url, options) { requests.push({ url: new URL(url), options }); return new Response(xml, { status }); },
      require(specifier) {
        if (specifier === '@cloudflare/next-on-pages') return { getOptionalRequestContext: () => ({ env }) };
        if (specifier.startsWith('@/')) return load(`${root}src/${specifier === '@/types' ? 'types/index' : specifier.slice(2)}.ts`);
        return require(specifier);
      },
    }, { filename: path });
    return module.exports;
  }
  return { service: load(path), load, requests };
}

const listing = `<ListBucketResult><EncodingType>url</EncodingType><IsTruncated>true</IsTruncated>
  <CommonPrefixes><Prefix>google-pixel%2FGoogle%20Pixel%203a%2F</Prefix></CommonPrefixes>
  <CommonPrefixes><Prefix>google-pixel%2F%E5%83%8F%E7%B4%A0%2BPro%2F</Prefix></CommonPrefixes>
  <CommonPrefixes><Prefix>google-pixel%2Forigin%2F</Prefix></CommonPrefixes>
  <CommonPrefixes><Prefix>google-pixel%2Fcompress%2F</Prefix></CommonPrefixes>
  <NextContinuationToken>cursor&amp;next=1</NextContinuationToken></ListBucketResult>`;

test('lists selectable immediate directories, decodes paths and preserves pagination', async () => {
  const { service, requests } = fixture(listing);
  const result = await service.listAdminR2Directories('google-pixel', 'previous+cursor');
  assert.equal(result.prefix, 'google-pixel/');
  assert.deepEqual(Array.from(result.directories), ['google-pixel/Google Pixel 3a', 'google-pixel/像素+Pro']);
  assert.equal(result.cursor, 'cursor&next=1');
  const { url, options } = requests[0];
  assert.equal(options.method, 'GET');
  assert.equal(url.pathname, '/wallpapers');
  assert.equal(url.searchParams.get('list-type'), '2');
  assert.equal(url.searchParams.get('delimiter'), '/');
  assert.equal(url.searchParams.get('prefix'), 'google-pixel/');
  assert.equal(url.searchParams.get('encoding-type'), 'url');
  assert.equal(url.searchParams.get('continuation-token'), 'previous+cursor');
  assert.ok(url.searchParams.get('X-Amz-Signature'));
});

test('supports root and empty directories without exposing individual file keys', async () => {
  const { service } = fixture(`<ListBucketResult><EncodingType>url</EncodingType><IsTruncated>false</IsTruncated>
    <CommonPrefixes><Prefix>desktopwalls%2F</Prefix></CommonPrefixes>
    <Contents><Key>private-file.jpg</Key></Contents></ListBucketResult>`);
  const result = await service.listAdminR2Directories('');
  assert.equal(result.prefix, '');
  assert.deepEqual(Array.from(result.directories), ['desktopwalls']);
  assert.equal(result.cursor, null);
  const empty = fixture('<ListBucketResult><IsTruncated>false</IsTruncated></ListBucketResult>');
  assert.equal((await empty.service.listAdminR2Directories('google-pixel/device')).directories.length, 0);
});

test('rejects invalid prefixes and pagination input before sending R2 requests', async () => {
  const { service, requests } = fixture(listing);
  for (const prefix of ['../secrets', 'https://example.com', 'google-pixel/origin', 'a//b', 'a/compress', null]) {
    await assert.rejects(() => service.listAdminR2Directories(prefix));
  }
  await assert.rejects(() => service.listAdminR2Directories('', 'x'.repeat(4097)));
  assert.equal(requests.length, 0);
});

test('reports R2 failure and rejects malformed listing rather than presenting an empty directory', async () => {
  const denied = fixture('<Error><Code>AccessDenied</Code></Error>', 403);
  await assert.rejects(() => denied.service.listAdminR2Directories(''), /403/);
  const invalid = fixture('<html>Unexpected response</html>');
  await assert.rejects(() => invalid.service.listAdminR2Directories(''));
  const missingCursor = fixture('<ListBucketResult><IsTruncated>true</IsTruncated></ListBucketResult>');
  await assert.rejects(() => missingCursor.service.listAdminR2Directories(''));
});

test('directory API requires the admin host and a valid session', async () => {
  const { load } = fixture(listing);
  const route = load(`${root}src/app/api/admin/r2-directories/route.ts`);
  const { createAdminSession } = load(`${root}src/lib/admin-auth.ts`);
  const { NextRequest } = require('next/server');
  const url = 'https://a.phwalls.com/api/admin/r2-directories?prefix=google-pixel';
  assert.equal((await route.GET(new NextRequest(url))).status, 401);
  assert.equal((await route.GET(new NextRequest(url.replace('a.phwalls.com', 'phwalls.com')))).status, 404);
  const cookie = `phwalls_admin_session=${await createAdminSession()}`;
  const response = await route.GET(new NextRequest(url, { headers: { cookie } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json()).data.directories.length, 2);
});
