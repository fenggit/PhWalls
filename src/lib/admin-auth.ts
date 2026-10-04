import { getOptionalRequestContext } from '@cloudflare/next-on-pages';
import { pbkdf2 } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'phwalls_admin_session';
const SESSION_SECONDS = 60 * 60 * 12;
const REMEMBERED_SESSION = 'remember';

function secret(name: string): string {
  const env = getOptionalRequestContext()?.env as Record<string, string> | undefined;
  return env?.[name] || process.env[name] || '';
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...Array.from(bytes)));
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

async function hmac(value: string, key: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value)));
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function isAdminHost(request: Request): boolean {
  const hostname = new URL(request.url).hostname.toLowerCase();
  const configured = secret('ADMIN_HOST') || 'a.phwalls.com';
  return hostname === configured || (process.env.NODE_ENV === 'development' && hostname === 'localhost');
}

export async function verifyAdminPassword(username: string, password: string): Promise<boolean> {
  const expectedUser = secret('ADMIN_USERNAME');
  const definition = secret('ADMIN_PASSWORD_HASH').split('$');
  if (!expectedUser || !password || username !== expectedUser || definition.length !== 4 ||
      definition[0] !== 'PBKDF2_SHA256') return false;
  const iterations = Number(definition[1]);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 1000000) return false;
  try {
    // Cloudflare Edge does not implement WebCrypto PBKDF2.
    const derived = pbkdf2(sha256, new TextEncoder().encode(password), base64ToBytes(definition[2]),
      { c: iterations, dkLen: 32 });
    return equalBytes(derived, base64ToBytes(definition[3]));
  } catch {
    return false;
  }
}

export async function createAdminSession(remember = false): Promise<string> {
  const signingKey = secret('ADMIN_SESSION_SECRET');
  if (signingKey.length < 32) throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters');
  const expiry = remember ? REMEMBERED_SESSION : Date.now() + SESSION_SECONDS * 1000;
  const payload = `${expiry}:${crypto.randomUUID()}`;
  const signature = await hmac(payload, signingKey);
  return `${bytesToBase64(new TextEncoder().encode(payload))}.${bytesToBase64(signature)}`;
}

export async function hasAdminSession(request: NextRequest): Promise<boolean> {
  if (!isAdminHost(request)) return false;
  const value = request.cookies.get(COOKIE_NAME)?.value;
  const signingKeys = [secret('ADMIN_SESSION_SECRET'), secret('ADMIN_SESSION_SECRET_PREVIOUS')]
    .filter((key) => key.length >= 32);
  if (!value || !signingKeys.length) return false;
  const parts = value.split('.');
  if (parts.length !== 2) return false;
  try {
    const payload = new TextDecoder().decode(base64ToBytes(parts[0]));
    const expiry = payload.split(':')[0];
    if (expiry !== REMEMBERED_SESSION && (!Number.isFinite(Number(expiry)) || Number(expiry) < Date.now())) return false;
    const signature = base64ToBytes(parts[1]);
    for (const key of signingKeys) {
      if (equalBytes(await hmac(payload, key), signature)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function adminWriteOriginValid(request: Request): boolean {
  const origin = request.headers.get('origin');
  const expected = new URL(request.url).origin;
  return origin === expected && request.headers.get('x-phwalls-admin') === '1';
}

export async function requireAdmin(request: NextRequest, write = false): Promise<NextResponse | null> {
  if (!isAdminHost(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!await hasAdminSession(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (write && !adminWriteOriginValid(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  return null;
}

export function setAdminCookie(response: NextResponse, value: string, remember = false): void {
  response.cookies.set(COOKIE_NAME, value, {
    secure: process.env.NODE_ENV !== 'development', httpOnly: true,
    sameSite: 'strict', path: '/',
    // 记住登录的令牌不设服务端期限；远期 Cookie 保证浏览器重启后仍可保留。
    ...(remember ? { expires: new Date('9999-12-31T23:59:59Z') } : { maxAge: SESSION_SECONDS }),
  });
}

export function clearAdminCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, '', {
    secure: process.env.NODE_ENV !== 'development', httpOnly: true,
    sameSite: 'strict', path: '/', maxAge: 0,
  });
}
