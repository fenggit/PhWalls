import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createTsLoader } from '../scripts/tests/load-ts.mjs';
import { sqliteD1 } from '../scripts/tests/sqlite-d1.mjs';

const require = createRequire(import.meta.url);
const { NextRequest } = require('next/server');
const appId = 'wxa64dd85e9a157ffd';
const now = Date.now();
const request = (path = '/api/public/mini/v1/collections', headers = {}) =>
  new NextRequest(`https://phwalls.com${path}`, { headers });

function fixture(t, db = sqliteD1(t), settings = {}) {
  const pending = [];
  const env = { DB: db, API_MONITOR_MINI_APP_ID: appId, ...settings };
  const load = createTsLoader({ '@cloudflare/next-on-pages': {
    getOptionalRequestContext: () => ({ env, ctx: { waitUntil(promise) { pending.push(promise); } } }),
  } });
  return { db, env, load, service: load('src/lib/api-monitor.ts'), async flush() { await Promise.all(pending); } };
}

test('source evidence distinguishes this mini program without trusting lookalike domains', () => {
  const { classifyApiSource } = createTsLoader()('src/lib/api-monitor-source.ts');
  const cases = [
    [{ Referer: `https://servicewechat.com/${appId}/12/page-frame.html` }, 'own_mini'],
    [{ Referer: `https://servicewechat.com/${appId}/12/page-frame.html`, Origin: 'https://servicewechat.com' }, 'own_mini'],
    [{ Referer: 'https://servicewechat.com/wx0000000000000000/1/page-frame.html' }, 'wechat'],
    [{ Referer: `https://servicewechat.com.evil.test/${appId}/1/page-frame.html` }, 'external'],
    [{ Origin: 'https://phwalls.com' }, 'site'],
    [{ Referer: 'https://www.phwalls.com/zh/' }, 'site'],
    [{ Referer: 'https://phwalls.com.evil.test/' }, 'external'],
    [{ Referer: 'https://phwalls.com/', Origin: 'https://elsewhere.test' }, 'external'],
    [{ 'User-Agent': 'MicroMessenger' }, 'unknown'],
    [{ Referer: 'not-a-url' }, 'unknown'],
    [{ Referer: 'data:text/plain,secret' }, 'unknown'],
    [{}, 'unknown'],
  ];
  for (const [headers, source] of cases) {
    assert.equal(classifyApiSource(request(undefined, headers), appId, 'https://phwalls.com').source, source);
  }
  const evidence = classifyApiSource(request(undefined, { Referer: 'https://elsewhere.test/private?secret=abc' }), appId, 'https://phwalls.com');
  assert.equal(evidence.source_host, 'elsewhere.test');
  assert.equal(JSON.stringify(evidence).includes('secret'), false);
});

test('recording uses trusted CF headers, normalizes details and never stores query secrets', async (t) => {
  const f = fixture(t);
  const req = request('/api/public/mini/v1/wallpapers/device%3Astatic%3Aasset?token=secret', {
    'CF-Connecting-IP': '203.0.113.4', 'CF-IPCountry': 'CN', 'X-Forwarded-For': '1.2.3.4',
    Referer: `https://servicewechat.com/${appId}/1/page-frame.html?secret=hidden`,
    'User-Agent': 'x'.repeat(600), Cookie: 'session=secret',
  });
  const original = new Response('ok', { status: 201, headers: { 'X-Test': 'kept' } });
  assert.equal(await f.service.observeApiRequest(req, async () => original), original);
  await f.flush();
  const { results } = await f.db.prepare('SELECT * FROM w_api_access_events').all();
  assert.equal(results.length, 1);
  const row = results[0];
  assert.equal(row.endpoint, '/api/public/mini/v1/wallpapers/:id');
  assert.equal(row.source, 'own_mini');
  assert.equal(row.client_ip, '203.0.113.4');
  assert.equal(row.country, 'CN');
  assert.equal(row.status, 201);
  assert.equal(row.user_agent.length, 256);
  assert.match(row.target_hash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(row).includes('secret'), false);
  assert.equal(JSON.stringify(row).includes('device%3A'), false);
});

test('missing CF IP stays unknown and the kill switch skips writes', async (t) => {
  const f = fixture(t);
  await f.service.observeApiRequest(request(undefined, { 'X-Forwarded-For': '1.2.3.4' }), async () => new Response('ok'));
  await f.flush();
  assert.equal((await f.db.prepare('SELECT client_ip FROM w_api_access_events').first()).client_ip, null);
  f.env.API_MONITOR_ENABLED = 'false';
  await f.service.observeApiRequest(request(), async () => new Response('ok'));
  await f.flush();
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS total FROM w_api_access_events').first()).total, 1);
});

test('logging does not wait for D1 or consume a download stream', async (t) => {
  let finishWrite;
  let started = false;
  const write = new Promise((resolve) => { finishWrite = resolve; });
  const f = fixture(t, { prepare() { return { bind() { return this; }, async all() { started = true; await write; return { success: true }; } }; } });
  let cancelled = false;
  const original = new Response(new ReadableStream({ cancel() { cancelled = true; } }), { status: 206 });
  const response = await f.service.observeApiRequest(request('/api/files/download?key=private/origin/image.png'), async () => original);
  assert.equal(response, original);
  assert.equal(response.bodyUsed, false);
  await response.body.cancel();
  assert.equal(cancelled, true);
  finishWrite();
  await f.flush();
  assert.equal(started, true);
});

test('missing migration and registration failure never alter a successful API response', async (t) => {
  const messages = [];
  t.mock.method(console, 'error', (value) => messages.push(value));
  const db = { prepare() { throw new Error('sensitive internal detail'); } };
  const f = fixture(t, db);
  const original = new Response('ok');
  assert.equal(await f.service.observeApiRequest(request(), async () => original), original);
  await f.flush();
  assert.equal(messages.some((value) => String(value).includes('sensitive')), false);
  const load = createTsLoader({ '@cloudflare/next-on-pages': { getOptionalRequestContext() { throw new Error('context unavailable'); } } });
  assert.equal(await load('src/lib/api-monitor.ts').observeApiRequest(request(), async () => original), original);
});

test('thrown handlers retain their error and record a 500 without logging its message', async (t) => {
  const f = fixture(t);
  const failure = new Error('private error');
  await assert.rejects(f.service.observeApiRequest(request(), async () => { throw failure; }), (error) => error === failure);
  await f.flush();
  assert.equal((await f.db.prepare('SELECT status FROM w_api_access_events').first()).status, 500);
});

test('real SQL groups endpoints, sources and IPs; flags suspicious minutes while preserving normal mini traffic', async (t) => {
  const f = fixture(t);
  const sql = `INSERT INTO w_api_access_events
    (id,created_at,endpoint,method,status,duration_ms,client_ip,country,source,source_host,mini_app_id,user_agent,target_hash)
    VALUES(?,?,'/api/files/download','GET',?,10,?,'CN',?,?,?,'WeChat',?)`;
  const minute = Math.floor(now / 60000) * 60000 - 60000;
  f.db.seed(Array.from({ length: 25 }, (_, i) => ({ sql, params: [String(i), minute + i, 200, '203.0.113.8', 'unknown', null, null, String(i)] })));
  f.db.seed([{ sql, params: ['normal', minute, 200, '203.0.113.9', 'own_mini', 'servicewechat.com', appId, 'one'] },
    { sql, params: ['external', minute, 503, '203.0.113.10', 'external', 'other.test', null, 'two'] },
    { sql, params: ['old', now - 8 * 86400000, 200, '203.0.113.99', 'unknown', null, null, 'old'] }]);
  const { loadApiMonitorReport } = f.load('src/lib/api-monitor-report.ts');
  const report = await loadApiMonitorReport(f.db, '24h', now);
  assert.equal(report.summary.requests, 27);
  assert.equal(report.summary.clients, 3);
  assert.equal(report.summary.errors, 1);
  assert.equal(report.sources.find((row) => row.source === 'own_mini').requests, 1);
  assert.equal(report.endpoints[0].requests, 27);
  assert.equal(report.clients[0].client_ip, '203.0.113.8');
  assert.equal(report.alerts.length, 1);
  assert.equal(report.alerts[0].client_ip, '203.0.113.8');
  assert.equal(report.alerts[0].downloads, 25);
  assert.equal(report.trend.reduce((sum, row) => sum + row.requests, 0), 27);
  assert.equal(report.recent.some((row) => row.client_ip === '203.0.113.99'), false);
  await assert.rejects(() => loadApiMonitorReport(f.db, '30d', now), /range/i);
});

test('retention trigger deletes expired records while leaving wallpaper data intact', async (t) => {
  const f = fixture(t);
  f.db.seed([{ sql: `INSERT INTO w_api_access_events(id,created_at,endpoint,method,status,duration_ms,source,user_agent)
    VALUES('expired',?,'/api/public/search','GET',200,1,'unknown','')`, params: [now - 8 * 86400000] }]);
  await f.service.observeApiRequest(request(), async () => new Response('ok'));
  await f.flush();
  assert.equal(await f.db.prepare("SELECT id FROM w_api_access_events WHERE id='expired'").first(), null);
  assert.ok((await f.db.prepare('SELECT COUNT(*) AS count FROM w_wallpapers').first()).count > 0);
});

test('request and resource thresholds include claimed own-mini traffic and exclude unknown IPs', async (t) => {
  const f = fixture(t);
  const minute = Math.floor(now / 60000) * 60000 - 60000;
  const sql = `INSERT INTO w_api_access_events(id,created_at,endpoint,method,status,duration_ms,client_ip,source,target_hash)
    VALUES(?,?,'/api/public/mini/v1/collections/:id','GET',200,1,?,'own_mini',?)`;
  const groups = [['203.0.113.1', 119, false], ['203.0.113.2', 120, false], ['203.0.113.3', 60, true], [null, 120, false]];
  f.db.seed(groups.flatMap(([ip, length, distinct]) => Array.from({ length }, (_, i) => ({
    sql, params: [`${ip}-${i}`, minute + i, ip, distinct ? String(i) : null],
  }))));
  const report = await f.load('src/lib/api-monitor-report.ts').loadApiMonitorReport(f.db, '1h', now);
  assert.equal(report.alerts.length, 2);
  assert.deepEqual(report.alerts.map((row) => row.client_ip).sort(), ['203.0.113.2', '203.0.113.3']);
  assert.equal(report.summary.clients, 3);
  assert.equal(report.summary.requests, 419);
});

test('unlisted and admin routes are never persisted', async (t) => {
  const f = fixture(t);
  for (const path of ['/api/admin/login', '/api/admin/api-monitor', '/api/unlisted']) {
    assert.equal((await f.service.observeApiRequest(request(path), async () => new Response('ok'))).status, 200);
  }
  await f.flush();
  assert.equal((await f.db.prepare('SELECT COUNT(*) AS total FROM w_api_access_events').first()).total, 0);
});

test('existing anonymous mini routes record normal, invalid and repeated calls without changing their contract', async (t) => {
  const f = fixture(t);
  const route = f.load('src/app/api/public/mini/v1/collections/route.ts');
  const headers = { Referer: `https://servicewechat.com/${appId}/1/page-frame.html` };
  for (let i = 0; i < 2; i++) {
    const response = await route.GET(request('/api/public/mini/v1/collections?kind=phone', headers));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal((await response.json()).data.length, 3);
  }
  assert.equal((await route.GET(request('/api/public/mini/v1/collections?pageSize=999', headers))).status, 400);
  await f.flush();
  assert.equal((await f.db.prepare("SELECT COUNT(*) AS total FROM w_api_access_events WHERE source='own_mini'").first()).total, 3);
});

test('monitor admin API requires the admin host and signed session, validates ranges and disables caching', async (t) => {
  const f = fixture(t);
  f.env.ADMIN_SESSION_SECRET = 'test-only-monitor-session-key-at-least-32-chars';
  const route = f.load('src/app/api/admin/api-monitor/route.ts');
  const wrongHost = await route.GET(new NextRequest('https://phwalls.com/api/admin/api-monitor'));
  assert.equal(wrongHost.status, 404);
  assert.equal((await route.GET(new NextRequest('https://a.phwalls.com/api/admin/api-monitor'))).status, 401);
  const auth = f.load('src/lib/admin-auth.ts');
  const token = await auth.createAdminSession();
  const headers = { Cookie: `phwalls_admin_session=${token}` };
  const response = await route.GET(new NextRequest('https://a.phwalls.com/api/admin/api-monitor?range=1h', { headers }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const body = await response.json();
  assert.equal(body.data.range, '1h');
  assert.equal(body.enabled, true);
  assert.equal(body.miniAppId, appId);
  assert.equal((await route.GET(new NextRequest('https://a.phwalls.com/api/admin/api-monitor?range=invalid', { headers }))).status, 400);
  delete f.env.DB;
  const unavailable = await route.GET(new NextRequest('https://a.phwalls.com/api/admin/api-monitor', { headers }));
  assert.equal(unavailable.status, 503);
  assert.deepEqual(await unavailable.json(), { error: 'MONITOR_UNAVAILABLE' });
});

test('IP ranking appends stable pages within the original cutoff and returns a complete final page', async (t) => {
  const f = fixture(t);
  const sql = `INSERT INTO w_api_access_events(id,created_at,endpoint,method,status,duration_ms,client_ip,source)
    VALUES(?,?,'/api/public/search','GET',200,1,?,'unknown')`;
  const ips = Array.from({ length: 45 }, (_, i) => `203.0.113.${String(i + 1).padStart(3, '0')}`);
  f.db.seed(ips.map((ip, i) => ({ sql, params: [String(i), now - 60000, ip] })));
  const service = f.load('src/lib/api-monitor-report.ts');
  const initial = await service.loadApiMonitorReport(f.db, '24h', now);
  assert.equal(initial.clients.length, 20);
  assert.equal(initial.client_pagination.page, 1);
  assert.equal(initial.client_pagination.total, 45);
  assert.equal(initial.client_pagination.has_more, true);
  assert.equal(initial.client_pagination.until, now);
  f.db.seed(Array.from({ length: 200 }, (_, i) => ({ sql, params: [`new-${i}`, now + 1000, '198.51.100.1'] })));
  const second = await service.loadApiMonitorClients(f.db, '24h', now, 2);
  const third = await service.loadApiMonitorClients(f.db, '24h', now, 3);
  const beyond = await service.loadApiMonitorClients(f.db, '24h', now, 4);
  assert.equal(second.clients.length, 20);
  assert.equal(third.clients.length, 5);
  assert.equal(third.pagination.has_more, false);
  assert.equal(beyond.clients.length, 0);
  assert.equal(beyond.pagination.total, 45);
  assert.deepEqual([...initial.clients, ...second.clients, ...third.clients].map((row) => row.client_ip), ips);
  for (const page of [0, -1, 1.5, 10001, NaN]) {
    await assert.rejects(() => service.loadApiMonitorClients(f.db, '24h', now, page), /pagination/i);
  }
});

test('IP anomaly markers include minutes omitted from the capped alert list and distinguish HTTP errors', async (t) => {
  const f = fixture(t);
  const minute = Math.floor(now / 60000) * 60000 - 60000;
  const sql = `INSERT INTO w_api_access_events(id,created_at,endpoint,method,status,duration_ms,client_ip,source,target_hash)
    VALUES(?,?,?,?,?,1,?,'own_mini',?)`;
  const rows = [];
  for (let m = 0; m < 35; m++) for (let i = 0; i < 20; i++) {
    rows.push({ sql, params: [`busy-${m}-${i}`, minute - m * 60000 + i, '/api/files/download', 'GET', 200, '203.0.113.1', String(i)] });
  }
  for (let ip = 2; ip <= 21; ip++) for (let i = 0; i < 22; i++) {
    rows.push({ sql, params: [`normal-${ip}-${i}`, minute - i * 60000, '/api/public/search', 'GET', 200, `203.0.113.${ip}`, null] });
  }
  for (let i = 0; i < 21; i++) {
    rows.push({ sql, params: [`hidden-${i}`, minute - 40 * 60000 + i, '/api/files/download', 'GET', 200, '203.0.113.99', String(i)] });
  }
  rows.push({ sql, params: ['failed', minute, '/api/public/search', 'GET', 503, '203.0.113.100', null] });
  f.db.seed(rows);
  const service = f.load('src/lib/api-monitor-report.ts');
  const report = await service.loadApiMonitorReport(f.db, '1h', now);
  assert.equal(report.alerts.length, 30);
  assert.equal(report.alerts.some((row) => row.client_ip === '203.0.113.99'), false);
  assert.equal(report.summary.anomalous_clients, 2);
  const next = await service.loadApiMonitorClients(f.db, '1h', now, 2);
  const hidden = next.clients.find((row) => row.client_ip === '203.0.113.99');
  assert.equal(hidden.alert_minutes, 1);
  assert.equal(hidden.peak_downloads, 21);
  assert.equal(hidden.peak_requests, 21);
  const failed = next.clients.find((row) => row.client_ip === '203.0.113.100');
  assert.equal(failed.errors, 1);
  assert.equal(failed.alert_minutes, 0);
});

test('client-only admin pages validate snapshot/page and retain authentication and no-store', async (t) => {
  const f = fixture(t);
  f.env.ADMIN_SESSION_SECRET = 'test-only-monitor-pagination-session-key-32-chars';
  const token = await f.load('src/lib/admin-auth.ts').createAdminSession();
  const route = f.load('src/app/api/admin/api-monitor/route.ts');
  const headers = { Cookie: `phwalls_admin_session=${token}` };
  const get = (query, auth = true) => route.GET(new NextRequest(`https://a.phwalls.com/api/admin/api-monitor?${query}`, auth ? { headers } : {}));
  const response = await get(`view=clients&range=24h&page=2&until=${now}`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const body = await response.json();
  assert.equal(body.data.pagination.page, 2);
  assert.deepEqual(body.data.clients, []);
  assert.equal(Object.hasOwn(body.data, 'trend'), false);
  assert.equal((await get(`view=clients&page=2&until=${now}`, false)).status, 401);
  for (const query of [`view=clients&page=0&until=${now}`, `view=clients&page=1.2&until=${now}`,
    `view=clients&page=10001&until=${now}`, 'view=clients&page=2', 'view=clients&page=2&until=not-a-number',
    `view=clients&page=2&until=${Date.now() + 60000}`, `view=clients&page=2&until=${now - 3600000}`, 'view=invalid']) {
    assert.equal((await get(query)).status, 400, query);
  }
});
