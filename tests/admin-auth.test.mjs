import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const { NextResponse } = require('next/server');

function fixture() {
  let now = Date.now();
  const env = { ADMIN_HOST: 'a.phwalls.com', ADMIN_SESSION_SECRET: 'test-only-signing-key-with-at-least-32-characters' };
  class ClockDate extends Date { static now() { return now; } }
  const module = { exports: {} };
  runInNewContext(ts.transpileModule(readFileSync(new URL('../src/lib/admin-auth.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    module, exports: module.exports, crypto: globalThis.crypto, Date: ClockDate, TextEncoder, TextDecoder,
    btoa, atob, URL, process: { env: { NODE_ENV: 'production' } },
    require(specifier) {
      if (specifier === '@cloudflare/next-on-pages') return { getOptionalRequestContext: () => ({ env }) };
      return require(specifier);
    },
  });
  return {
    service: module.exports, env,
    advance(milliseconds) { now += milliseconds; },
    request(token) { return { url: 'https://a.phwalls.com/api/admin/session', cookies: { get: () => ({ value: token }) } }; },
  };
}

test('remembered sessions remain valid beyond thirty days without an application expiry', async () => {
  const { service, request, advance } = fixture();
  const token = await service.createAdminSession(true);
  advance(365 * 100 * 24 * 60 * 60 * 1000);
  assert.equal(await service.hasAdminSession(request(token)), true);
});

test('sessions without remember still expire after twelve hours', async () => {
  const { service, request, advance } = fixture();
  const token = await service.createAdminSession(false);
  advance(11 * 60 * 60 * 1000);
  assert.equal(await service.hasAdminSession(request(token)), true);
  advance(2 * 60 * 60 * 1000);
  assert.equal(await service.hasAdminSession(request(token)), false);
});

test('credential signing-key rotation revokes remembered sessions', async () => {
  const { service, request, env } = fixture();
  const token = await service.createAdminSession(true);
  env.ADMIN_SESSION_SECRET = 'replacement-test-signing-key-at-least-32-characters';
  assert.equal(await service.hasAdminSession(request(token)), false);
});

test('remembered cookie is persistent and retains HttpOnly and secure flags', () => {
  const { service } = fixture();
  const response = NextResponse.json({ ok: true });
  service.setAdminCookie(response, 'signed-test-token', true);
  const cookie = response.cookies.get('phwalls_admin_session');
  assert.equal(cookie.maxAge, undefined);
  assert.ok(cookie.expires.getUTCFullYear() > 2100);
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.secure, true);
  service.clearAdminCookie(response);
  assert.equal(response.cookies.get('phwalls_admin_session').maxAge, 0);
});
