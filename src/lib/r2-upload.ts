import { getOptionalRequestContext } from '@cloudflare/next-on-pages';

function configuration() {
  const bindings = getOptionalRequestContext()?.env as Record<string, string> | undefined;
  const get = (name: string) => bindings?.[name] || process.env[name] || '';
  const endpoint = get('R2_ENDPOINT_PROD');
  const bucket = get('R2_BUCKET_NAME_PROD');
  const access = get('R2_ACCESS_KEY_ID_PROD');
  const secret = get('R2_SECRET_ACCESS_KEY_PROD');
  if (!endpoint || !bucket || !access || !secret) throw new Error('R2 凭据未配置');
  return { endpoint: new URL(endpoint), bucket, access, secret, region: get('R2_REGION_PROD') || 'auto' };
}

const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
  `%${character.charCodeAt(0).toString(16).toUpperCase()}`);

async function sha256(value: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

async function sign(key: Uint8Array, value: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(value)));
}

async function signR2Request(method: 'PUT' | 'HEAD' | 'DELETE' | 'GET', key: string, mimeType?: string,
  extraQuery: Record<string, string> = {}, extraHeaders: Record<string, string> = {}): Promise<string> {
  const config = configuration();
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const stamp = date.slice(0, 8);
  const scope = `${stamp}/${config.region}/s3/aws4_request`;
  const path = `/${encode(config.bucket)}${key ? `/${key.split('/').map(encode).join('/')}` : ''}`;
  const headerValues: Record<string, string> = { host: config.endpoint.host, ...extraHeaders,
    ...(mimeType ? { 'content-type': mimeType } : {}) };
  const headerNames = Object.keys(headerValues).sort();
  const signedHeaders = headerNames.join(';');
  const params: Record<string, string> = {
    ...extraQuery,
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.access}/${scope}`,
    'X-Amz-Date': date,
    'X-Amz-Expires': '900',
    'X-Amz-SignedHeaders': signedHeaders,
  };
  const query = Object.keys(params).sort().map((name) => `${encode(name)}=${encode(params[name])}`).join('&');
  const headers = headerNames.map((name) => `${name}:${headerValues[name]}\n`).join('');
  const canonical = [method, path, query, headers, signedHeaders, 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', date, scope, await sha256(canonical)].join('\n');
  const stampKey = await sign(new TextEncoder().encode(`AWS4${config.secret}`), stamp);
  const regionKey = await sign(stampKey, config.region);
  const serviceKey = await sign(regionKey, 's3');
  const signingKey = await sign(serviceKey, 'aws4_request');
  const signature = Array.from(await sign(signingKey, stringToSign)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${config.endpoint.origin}${path}?${query}&X-Amz-Signature=${signature}`;
}

export async function createR2UploadUrl(key: string, mimeType: string, preventOverwrite = false): Promise<string> {
  return signR2Request('PUT', key, mimeType, {}, preventOverwrite ? { 'if-none-match': '*' } : {});
}

export async function headR2Object(key: string): Promise<{ size: number; mimeType: string } | null> {
  const response = await fetch(await signR2Request('HEAD', key), { method: 'HEAD' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`R2 文件检查失败 (${response.status})`);
  return {
    size: Number(response.headers.get('content-length') || 0),
    mimeType: response.headers.get('content-type') || '',
  };
}

export async function deleteR2Object(key: string): Promise<void> {
  const response = await fetch(await signR2Request('DELETE', key), { method: 'DELETE', signal: AbortSignal.timeout(15000) });
  if (!response.ok && response.status !== 404) throw new Error(`R2 文件删除失败 (${response.status})`);
}

export async function listR2DirectoryPage(prefix: string, cursor?: string): Promise<string> {
  const query: Record<string, string> = {
    'list-type': '2', delimiter: '/', prefix, 'encoding-type': 'url', 'max-keys': '200',
  };
  if (cursor) query['continuation-token'] = cursor;
  const response = await fetch(await signR2Request('GET', '', undefined, query), {
    method: 'GET', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`R2 目录读取失败 (${response.status})`);
  return response.text();
}

type UploadBinding = { deviceId: string; role: 'origin' | 'compress' | 'preview'; prefix: string };
type UploadGrant = { key: string; size: number; mimeType: string; expires: number } & Partial<UploadBinding>;

async function grantSignature(encoded: string): Promise<string> {
  const bindings = getOptionalRequestContext()?.env as Record<string, string> | undefined;
  const secret = bindings?.ADMIN_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET || '';
  if (secret.length < 32) throw new Error('ADMIN_SESSION_SECRET 未配置');
  const signature = await sign(new TextEncoder().encode(secret), encoded);
  return Array.from(signature).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createUploadGrant(key: string, size: number, mimeType: string, binding: UploadBinding): Promise<string> {
  const payload = JSON.stringify({ key, size, mimeType, ...binding, expires: Date.now() + 15 * 60 * 1000 } satisfies UploadGrant);
  const encoded = btoa(String.fromCharCode(...Array.from(new TextEncoder().encode(payload))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${encoded}.${await grantSignature(encoded)}`;
}

export async function verifyUploadGrant(value: string): Promise<UploadGrant> {
  const [encoded, signature] = value.split('.');
  if (!encoded || !signature || signature !== await grantSignature(encoded)) throw new Error('上传授权无效');
  const bytes = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), (character) => character.charCodeAt(0));
  const grant = JSON.parse(new TextDecoder().decode(bytes)) as UploadGrant;
  if (!grant.key || !grant.size || !grant.mimeType || grant.expires < Date.now()) throw new Error('上传授权已过期');
  return grant;
}
