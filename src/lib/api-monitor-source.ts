import type { ApiSource } from '@/lib/api-monitor-types';

function webUrl(value: string | null): URL | null {
  if (!value || value.length > 4096) return null;
  try {
    const url = new URL(value);
    return /^(https?:)$/.test(url.protocol) && !url.username && !url.password ? url : null;
  } catch { return null; }
}

// These headers describe claimed context. None of these classifications authenticate a caller.
export function classifyApiSource(request: Request, ownAppId: string, siteOrigin: string): {
  source: ApiSource; source_host: string | null; mini_app_id: string | null;
} {
  const site = webUrl(siteOrigin);
  const referrer = webUrl(request.headers.get('referer'));
  const origin = webUrl(request.headers.get('origin'));
  const isSite = (url: URL) => Boolean(site && url.protocol === site.protocol && url.port === site.port &&
    (url.hostname === site.hostname || url.hostname === `www.${site.hostname.replace(/^www\./, '')}` ||
      url.hostname === site.hostname.replace(/^www\./, '')));
  // An explicit external Origin takes precedence over a seemingly local Referer.
  const evidence = origin && !isSite(origin) && origin.origin !== referrer?.origin ? origin : referrer || origin;
  if (!evidence) return { source: 'unknown', source_host: null, mini_app_id: null };
  const source_host = evidence.hostname.slice(0, 253);
  if (isSite(evidence)) return { source: 'site', source_host, mini_app_id: null };
  if (evidence.protocol === 'https:' && evidence.hostname === 'servicewechat.com' && !evidence.port) {
    const appId = evidence.pathname.match(/^\/(wx[0-9a-f]{16})(?:\/|$)/)?.[1] || null;
    return { source: appId && appId === ownAppId ? 'own_mini' : 'wechat', source_host, mini_app_id: appId };
  }
  return { source: 'external', source_host, mini_app_id: null };
}

const ENDPOINTS = new Set([
  '/api/public/search', '/api/public/tabs', '/api/public/wallpaper-image',
  '/api/public/wallpaper-download', '/api/public/share-image',
  '/api/files/download', '/api/files/download-url', '/api/files/private-url',
  '/api/files/batch-private-urls', '/api/files/preview',
  '/api/public/mini/v1/brands', '/api/public/mini/v1/collections',
]);

export function getApiEndpoint(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, '');
  if (ENDPOINTS.has(path)) return path;
  const detail = path.match(/^(\/api\/public\/mini\/v1\/(?:collections|wallpapers))\/[^/]+$/);
  return detail ? `${detail[1]}/:id` : null;
}
