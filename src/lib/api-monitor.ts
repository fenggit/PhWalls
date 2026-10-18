import 'server-only';
import { getOptionalRequestContext } from '@cloudflare/next-on-pages';
import { classifyApiSource, getApiEndpoint } from '@/lib/api-monitor-source';
import type { ApiAccessEvent } from '@/lib/api-monitor-types';

export type ApiMonitorEnv = {
  DB?: D1Database;
  API_MONITOR_ENABLED?: string;
  API_MONITOR_MINI_APP_ID?: string;
};

export function apiMonitoringEnabled(env: ApiMonitorEnv): boolean {
  return (env.API_MONITOR_ENABLED ?? process.env.API_MONITOR_ENABLED) !== 'false';
}

function connectionIp(value: string | null): string | null {
  // CF replaces this header at its edge. Do not fall back to user-supplied forwarding headers.
  if (!value || value.length > 45) return null;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    return value.split('.').every((part) => Number(part) <= 255) ? value : null;
  }
  if (value.includes(':') && /^[0-9a-f:.]+$/i.test(value)) {
    try { return new URL(`http://[${value}]/`).hostname.slice(1, -1); } catch { return null; }
  }
  return null;
}

async function writeEvent(db: D1Database, request: Request, endpoint: string, status: number,
  duration: number, createdAt: number, ownAppId: string): Promise<void> {
  const url = new URL(request.url);
  const target = url.searchParams.get('key') || (endpoint.endsWith('/:id') ? url.pathname.split('/').pop() : null);
  // Do not persist full URLs, object keys, cookies, request bodies or search keywords.
  const digest = target && target.length <= 4096
    ? await crypto.subtle.digest('SHA-256', new TextEncoder().encode(target)) : null;
  const targetHash = digest ? Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('') : null;
  const country = request.headers.get('cf-ipcountry');
  const event: ApiAccessEvent = {
    id: crypto.randomUUID(), created_at: createdAt, endpoint,
    method: request.method, status, duration_ms: Math.max(0, Math.round(duration * 100) / 100),
    client_ip: connectionIp(request.headers.get('cf-connecting-ip')),
    country: country && /^(?:[A-Z]{2}|T1)$/.test(country) ? country : null,
    ...classifyApiSource(request, ownAppId, process.env.NEXT_PUBLIC_SITE_URL || 'https://phwalls.com'),
    user_agent: (request.headers.get('user-agent') || '').slice(0, 256), target_hash: targetHash,
  };
  const result = await db.prepare(`INSERT INTO w_api_access_events
    (id,created_at,endpoint,method,status,duration_ms,client_ip,country,source,source_host,mini_app_id,user_agent,target_hash)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    event.id, event.created_at, event.endpoint, event.method, event.status, event.duration_ms,
    event.client_ip, event.country, event.source, event.source_host, event.mini_app_id, event.user_agent, event.target_hash,
  ).all();
  if (!result.success) throw new Error('Monitor write unavailable');
}

function record(request: Request, status: number, duration: number, createdAt: number): void {
  try {
    const context = getOptionalRequestContext();
    const env = context?.env as ApiMonitorEnv | undefined;
    const endpoint = getApiEndpoint(new URL(request.url).pathname);
    if (!endpoint || !env || !apiMonitoringEnabled(env) || !env.DB || !context?.ctx) return;
    const work = writeEvent(env.DB, request, endpoint, status, duration, createdAt,
      env.API_MONITOR_MINI_APP_ID || process.env.API_MONITOR_MINI_APP_ID || '')
      .catch(() => { console.error('API monitor write unavailable'); });
    context.ctx.waitUntil(work);
  } catch {
    // Even missing context or a failed waitUntil registration must not alter the response.
    console.error('API monitor scheduling unavailable');
  }
}

// Return the original Response without cloning/reading its body or waiting for telemetry.
export async function observeApiRequest<T extends Response>(request: Request, operation: () => Promise<T>): Promise<T> {
  const started = performance.now();
  const createdAt = Date.now();
  let status = 500;
  try {
    const response = await operation();
    status = response.status;
    return response;
  } finally {
    record(request, status, performance.now() - started, createdAt);
  }
}
