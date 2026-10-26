/** Minimal SigV4 client for exact-key HEAD and conditional DELETE operations. */
import { createHash, createHmac } from 'node:crypto';
const hash = data => createHash('sha256').update(data).digest('hex');
const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
export function createCatalogR2Client(env = process.env, fetcher = fetch) {
  const required = name => { if (!env[name]) throw new Error(`${name} is missing`); return env[name]; };
  const endpoint = new URL(required('R2_ENDPOINT_PROD')), bucket = required('R2_BUCKET_NAME_PROD');
  const access = required('R2_ACCESS_KEY_ID_PROD'), secret = required('R2_SECRET_ACCESS_KEY_PROD'), region = env.R2_REGION_PROD || 'auto';
  async function request(method, key, extra = {}) {
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''), stamp = date.slice(0, 8), scope = `${stamp}/${region}/s3/aws4_request`;
    const path = `/${encode(bucket)}/${key.split('/').map(encode).join('/')}`, payload = hash('');
    const headers = { host: endpoint.host, 'x-amz-date': date, 'x-amz-content-sha256': payload, ...extra };
    const names = Object.keys(headers).sort(), signed = names.join(';');
    const canonical = [method, path, '', names.map(name => `${name}:${headers[name].trim()}\n`).join(''), signed, payload].join('\n');
    const signing = hmac(hmac(hmac(hmac(`AWS4${secret}`, stamp), region), 's3'), 'aws4_request');
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${access}/${scope}, SignedHeaders=${signed}, Signature=${hmac(signing, ['AWS4-HMAC-SHA256', date, scope, hash(canonical)].join('\n')).toString('hex')}`;
    // Retry only transient failures. Every attempt keeps the same signed
    // conditional headers, including If-Match for an idempotent DELETE.
    for (let attempt = 0; attempt < 4; attempt++) {
      let response;
      try { response = await fetcher(endpoint.origin + path, { method, headers, signal: AbortSignal.timeout(30000) }); }
      catch {
        if (attempt === 3) throw new Error(`R2 ${method} network failure after 4 attempts`);
      }
      if (response) {
        if (response.ok || response.status === 404) return response;
        await response.body?.cancel().catch(() => {});
        if ((response.status !== 429 && response.status < 500) || attempt === 3) throw new Error(`R2 ${method} failed: HTTP ${response.status}`);
      }
      await new Promise(resolve => setTimeout(resolve, 250 * 2 ** attempt + Math.floor(Math.random() * 100)));
    }

  }
  return {
    async head(key) { const response = await request('HEAD', key); return response.status === 404 ? null : { etag: response.headers.get('etag'), size: Number(response.headers.get('content-length')), mimeType: response.headers.get('content-type') }; },
    async delete(key, etag) { const response = await request('DELETE', key, { 'if-match': etag }); await response.body?.cancel(); return response.status; },
  };
}
