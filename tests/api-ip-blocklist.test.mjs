import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createTsLoader } from '../scripts/tests/load-ts.mjs';
import { sqliteD1 } from '../scripts/tests/sqlite-d1.mjs';
const { NextRequest } = createRequire(import.meta.url)('next/server');
function fixture(t) {
  const db = sqliteD1(t), pending = [];
  const env = { DB: db, ADMIN_SESSION_SECRET: 'blocklist-test-session-secret-at-least-32-chars' };
  const load = createTsLoader({ '@cloudflare/next-on-pages': {
    getOptionalRequestContext: () => ({ env, ctx: { waitUntil(p) { pending.push(p); } } }),
  } });
  return { db, env, load, pending };
}
test('IP validation canonicalizes IPv6 and mapped IPv4 and rejects non-address input', () => {
  const { normalizeClientIp: ip } = createTsLoader()('src/lib/client-ip.ts');
  assert.equal(ip('2001:0DB8:0:0::1'), '2001:db8::1');
  assert.equal(ip('::ffff:203.0.113.4'), '203.0.113.4');
  assert.equal(ip('203.0.113.4'), '203.0.113.4');
  for (const input of ['256.1.1.1', '127.1', '01.2.3.4', '1.2.3.4/32', '::1%eth0', 'example.com', '', null, 5]) assert.equal(ip(input), null);
});
test('admin blocklist enforces authentication and CSRF, supports canonical idempotent add/list/remove', async (t) => {
  const f = fixture(t), route = f.load('src/app/api/admin/api-monitor/blocklist/route.ts');
  const url = 'https://a.phwalls.com/api/admin/api-monitor/blocklist';
  assert.equal((await route.GET(new NextRequest(url))).status, 401);
  assert.equal((await route.GET(new NextRequest(url.replace('a.phwalls.com', 'phwalls.com')))).status, 404);
  const token = await f.load('src/lib/admin-auth.ts').createAdminSession();
  const headers = { Cookie: `phwalls_admin_session=${token}`, Origin: 'https://a.phwalls.com', 'X-Phwalls-Admin': '1', 'Content-Type': 'application/json' };
  const write = (method, ip, h = headers) => route[method](new NextRequest(url, { method, headers: h, body: JSON.stringify({ ip }) }));
  assert.equal((await write('POST', '::1', { ...headers, Origin: 'https://evil.test' })).status, 403);
  assert.equal((await write('POST', 'not-an-ip')).status, 400);
  for (const ip of ['2001:0db8:0::1', '2001:db8::1']) assert.equal((await write('POST', ip)).status, 200);
  let response = await route.GET(new NextRequest(url, { headers }));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await response.json()).data.length, 1);
  assert.equal((await write('DELETE', '2001:db8::1')).status, 200);
  assert.equal((await (await route.GET(new NextRequest(url, { headers }))).json()).data.length, 0);
  delete f.env.DB;
  assert.equal((await write('POST', '::1')).status, 503);
});
test('blocked trusted IP is denied before work, logged as 403, and works again after removal even when collection paused', async (t) => {
  const f = fixture(t);
  await f.db.prepare('INSERT INTO w_api_ip_blocklist(ip,created_at) VALUES(?,?)').bind('203.0.113.4', Date.now()).all();
  const { observeApiRequest } = f.load('src/lib/api-monitor.ts');
  let calls = 0;
  const op = async () => { calls++; return new Response('ok'); };
  const req = (headers) => new NextRequest('https://phwalls.com/api/public/search', { headers });
  const response = await observeApiRequest(req({ 'CF-Connecting-IP': '::ffff:203.0.113.4' }), op);
  assert.equal(response.status, 403); assert.equal(calls, 0);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  await Promise.all(f.pending);
  assert.equal((await f.db.prepare('SELECT status FROM w_api_access_events').first()).status, 403);
  f.env.API_MONITOR_ENABLED = 'false';
  assert.equal((await observeApiRequest(req({ 'CF-Connecting-IP': '203.0.113.4' }), op)).status, 403);
  assert.equal((await observeApiRequest(req({ 'X-Forwarded-For': '203.0.113.4' }), op)).status, 200);
  await f.db.prepare('DELETE FROM w_api_ip_blocklist').all();
  assert.equal((await observeApiRequest(req({ 'CF-Connecting-IP': '203.0.113.4' }), op)).status, 200);
  assert.equal(calls, 2);
});
test('blocklist lookup failure never executes protected work', async (t) => {
  const f = fixture(t);
  await f.db.prepare('DROP TABLE w_api_ip_blocklist').all();
  let ran = false;
  const response = await f.load('src/lib/api-monitor.ts').observeApiRequest(new NextRequest('https://phwalls.com/api/public/search', {
    headers: { 'CF-Connecting-IP': '203.0.113.4' },
  }), async () => { ran = true; return new Response('ok'); });
  assert.equal(response.status, 503); assert.equal(ran, false);
  await Promise.all(f.pending);
});
test('blocklist paginates all entries and mini routes retain structured denial errors', async (t) => {
  const f = fixture(t);
  for (let i = 0; i < 55; i++) await f.db.prepare('INSERT INTO w_api_ip_blocklist(ip,created_at) VALUES(?,?)').bind(`203.0.113.${i}`, i).all();
  const route = f.load('src/app/api/admin/api-monitor/blocklist/route.ts');
  const token = await f.load('src/lib/admin-auth.ts').createAdminSession();
  const headers = { Cookie: `phwalls_admin_session=${token}` };
  const url = 'https://a.phwalls.com/api/admin/api-monitor/blocklist';
  const first = await (await route.GET(new NextRequest(url, { headers }))).json();
  const last = await (await route.GET(new NextRequest(`${url}?page=2`, { headers }))).json();
  assert.equal(first.data.length, 50); assert.equal(first.hasMore, true);
  assert.equal(last.data.length, 5); assert.equal(last.hasMore, false);
  assert.equal(new Set([...first.data, ...last.data].map((entry) => entry.ip)).size, 55);
  for (const page of ['0', '-1', '1.5', 'NaN']) assert.equal((await route.GET(new NextRequest(`${url}?page=${page}`, { headers }))).status, 400);
  const mini = f.load('src/app/api/public/mini/v1/collections/route.ts');
  const response = await mini.GET(new NextRequest('https://phwalls.com/api/public/mini/v1/collections', { headers: { 'CF-Connecting-IP': '203.0.113.1' } }));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: { code: 'IP_BLOCKED', message: 'Access denied' } });
  await Promise.all(f.pending);
});
