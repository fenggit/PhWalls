import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createTsLoader } from '../scripts/tests/load-ts.mjs';

const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
const key = 'oneplus/OnePlus 16/origin/蓝色.png';
const paths = ['api/files/download', 'api/public/wallpaper-download'];

function setup(t, { published = true, upstream } = {}) {
  const logs = [], checks = [], fetches = [];
  t.mock.method(console, 'info', (...args) => logs.push(args));
  t.mock.method(console, 'error', (...args) => logs.push(args));
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    fetches.push({ url, options });
    return upstream ?? new Response('original', { headers: {
      'Content-Type': 'image/png', 'Content-Length': '8',
      'CF-Cache-Status': 'HIT', 'CF-Ray': 'abc-SIN',
    } });
  });
  const load = createTsLoader({
    '@/lib/wallpaper-db': { async isPublishedWallpaperKey(...args) { checks.push(args); return published; } },
  });
  return {
    logs, checks, fetches,
    get(path, objectKey = key) {
      return load(`src/app/${path}/route.ts`).GET(new NextRequest(
        `https://phwalls.com/${path}?key=${encodeURIComponent(objectKey)}`,
        { headers: { 'CF-Ray': 'def-SEA' } },
      ));
    },
  };
}

for (const path of paths) {
  test(`${path} reports validation/upstream timing and streams the original attachment`, async (t) => {
    const r = setup(t);
    const response = await r.get(path);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('content-length'), '8');
    assert.match(response.headers.get('content-disposition'), /filename\*=UTF-8''.*%E8%93%9D%E8%89%B2\.png/);
    assert.match(response.headers.get('server-timing'), /validation;dur=\d+(\.\d+)?/);
    assert.match(response.headers.get('server-timing'), /upstream;dur=\d+(\.\d+)?/);
    assert.equal(response.headers.get('x-wallpaper-upstream-cache'), 'HIT');
    assert.deepEqual(r.checks, [[key, true]]);
    assert.equal(await response.text(), 'original');
    const entry = r.logs.find(([value]) => typeof value === 'string' && value.includes('wallpaper_download'));
    assert.ok(entry, 'A completed stream must record download diagnostics');
    const metrics = JSON.parse(entry[0]);
    assert.equal(metrics.outcome, 'complete');
    assert.equal(metrics.bytes, 8);
    assert.equal(metrics.request_ray, 'def-SEA');
    assert.equal(metrics.upstream_ray, 'abc-SIN');
    assert.equal(metrics.upstream_cache, 'HIT');
    assert.ok(metrics.total_ms >= metrics.headers_ms);
  });

  test(`${path} checks publication on every download and never fetches an unpublished original`, async (t) => {
    const r = setup(t, { published: false });
    for (let i = 0; i < 2; i++) {
      const response = await r.get(path);
      assert.equal(response.status, 400);
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
    assert.equal(r.checks.length, 2);
    assert.equal(r.fetches.length, 0);
  });
}

test('the response returns before the full original arrives and cancellation reaches the upstream stream', async (t) => {
  let cancelled = false;
  const body = new ReadableStream({ cancel() { cancelled = true; } });
  const r = setup(t, { upstream: new Response(body) });
  const response = await r.get(paths[0]);
  assert.equal(response.status, 200);
  await response.body.cancel();
  assert.equal(cancelled, true);
  assert.equal(JSON.parse(r.logs[0][0]).outcome, 'cancelled');
});

test('a failed transfer errors the response stream and records failure rather than completion', async (t) => {
  let controller;
  const body = new ReadableStream({ start(value) { controller = value; } });
  const r = setup(t, { upstream: new Response(body) });
  const response = await r.get(paths[0]);
  controller.error(new Error('Upstream disconnected'));
  await assert.rejects(response.text(), /Upstream disconnected/);
  assert.equal(JSON.parse(r.logs[0][0]).outcome, 'error');
  assert.equal(JSON.parse(r.logs[0][0]).phase, 'transfer');
  assert.equal(JSON.parse(r.logs[0][0]).error_code, 'TRANSFER_STREAM');
});

test('upstream errors return a timed no-store error without exposing source URLs', async (t) => {
  const r = setup(t, { upstream: new Response('private upstream details', { status: 503 }) });
  const response = await r.get(paths[0]);
  assert.equal(response.status, 500);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('server-timing'), /upstream;dur=/);
  assert.deepEqual(await response.json(), { error: 'Failed to download file' });
  const metrics = JSON.parse(r.logs[0][0]);
  assert.equal(metrics.upstream_status, 503);
  assert.equal(metrics.phase, 'upstream');
  assert.equal(metrics.error_code, 'UPSTREAM_HTTP');
});

test('connection failures have a distinct diagnostic code without leaking the signed source', async (t) => {
  const r = setup(t);
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Cannot fetch https://private.example/?X-Amz-Signature=secret');
  });
  const response = await r.get(paths[0]);
  assert.equal(response.status, 500);
  const entry = r.logs[0][0];
  const metrics = JSON.parse(entry);
  assert.equal(metrics.phase, 'upstream');
  assert.equal(metrics.upstream_status, null);
  assert.equal(metrics.error_code, 'UPSTREAM_FETCH');
  assert.equal(entry.includes('private.example'), false);
  assert.equal(entry.includes('secret'), false);
});

test('diagnostics preserve streaming backpressure and log all bytes only when the body is consumed', async (t) => {
  let pulls = 0;
  const upstream = new Response(new ReadableStream({
    pull(controller) {
      pulls++;
      if (pulls > 16) controller.close();
      else controller.enqueue(new Uint8Array(65536));
    },
  }, { highWaterMark: 0 }));
  const r = setup(t, { upstream });
  const response = await r.get(paths[0]);
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(pulls <= 1, 'The response must not drain an original before the client reads it');
  assert.equal(r.logs.length, 0);
  const reader = response.body.getReader();
  let received = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    received += chunk.value.byteLength;
  }
  assert.equal(received, 16 * 65536);
  assert.equal(r.logs.length, 1);
  assert.equal(JSON.parse(r.logs[0][0]).bytes, received);
});
