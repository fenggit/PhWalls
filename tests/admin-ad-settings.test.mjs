import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { createTsLoader } from '../scripts/tests/load-ts.mjs';
import { sqliteD1 } from '../scripts/tests/sqlite-d1.mjs';

const { NextRequest } = createRequire(import.meta.url)('next/server');

function fixture(t) {
  const db = sqliteD1(t);
  const env = { DB: db, ADMIN_SESSION_SECRET: 'ad-settings-test-session-secret-at-least-32-chars' };
  const load = createTsLoader({ '@cloudflare/next-on-pages': { getOptionalRequestContext: () => ({ env }) } });
  return { db, load };
}

test('advertising setting defaults to enabled and is controlled only by an authenticated admin', async (t) => {
  const { db, load } = fixture(t);
  const route = load('src/app/api/admin/ad-settings/route.ts');
  const url = 'https://a.phwalls.com/api/admin/ad-settings';
  assert.equal((await route.GET(new NextRequest(url))).status, 401);

  const token = await load('src/lib/admin-auth.ts').createAdminSession();
  const headers = { Cookie: `phwalls_admin_session=${token}`, Origin: 'https://a.phwalls.com', 'X-Phwalls-Admin': '1', 'Content-Type': 'application/json' };
  let response = await route.GET(new NextRequest(url, { headers }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(await response.json(), { ads_enabled: true });
  assert.equal(await load('src/lib/advertising-settings.ts').isAdvertisingEnabled(), true);

  assert.equal((await route.PUT(new NextRequest(url, { method: 'PUT', headers: { ...headers, Origin: 'https://evil.test' }, body: JSON.stringify({ ads_enabled: false }) }))).status, 403);
  assert.equal((await route.PUT(new NextRequest(url, { method: 'PUT', headers, body: JSON.stringify({ ads_enabled: 0 }) }))).status, 400);
  response = await route.PUT(new NextRequest(url, { method: 'PUT', headers, body: JSON.stringify({ ads_enabled: false }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ads_enabled: false });
  assert.equal(await load('src/lib/advertising-settings.ts').isAdvertisingEnabled(), false);

  await db.prepare('UPDATE w_download_settings SET ads_enabled = 1 WHERE id = 1').all();
  assert.equal(await load('src/lib/advertising-settings.ts').isAdvertisingEnabled(), true);
});
