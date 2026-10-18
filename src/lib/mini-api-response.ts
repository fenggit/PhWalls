import { observeApiRequest } from '@/lib/api-monitor';
import { NextRequest, NextResponse } from 'next/server';
import {
  MiniApiError,
  parseMiniOptions,
  type MiniOptions,
} from '@/lib/mini-api';
import { withWallpaperQueryCache } from '@/lib/wallpaper-query-cache';

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};
async function respond(
  request: NextRequest,
  operation: (options: MiniOptions, origin: string) => Promise<object>,
  cacheScope?: 'brands' | 'collections',
) {
  const started = performance.now();
  const responseHeaders = () => ({
    ...RESPONSE_HEADERS,
    'Server-Timing': `mini;dur=${(performance.now() - started).toFixed(2)}`,
  });
  try {
    const options = parseMiniOptions(request.nextUrl.searchParams);
    const origin = new URL(
      process.env.NEXT_PUBLIC_SITE_URL || 'https://phwalls.com',
    ).origin;
    const load = () => operation(options, origin);
    // 浏览器不缓存；CF 节点仅短暂缓存展示列表，详情和下载核验实时查询。
    const refresh = /(?:^|,)\s*(?:no-cache|no-store)\s*(?:,|$)/i.test(
      request.headers.get('cache-control') || '',
    );
    const result = cacheScope && !refresh
      ? await withWallpaperQueryCache([
        'mini-v1', cacheScope, origin, options.language,
        options.kind, options.brand, options.query,
        ...(cacheScope === 'collections' ? [options.page, options.pageSize] : []),
      ], load)
      : await load();
    return NextResponse.json(
      { ...result, meta: { version: '1', language: options.language } },
      {
        headers: { ...responseHeaders(), 'Content-Language': options.language },
      },
    );
  } catch (error) {
    if (error instanceof MiniApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status, headers: responseHeaders() },
      );
    }
    console.error('Mini-program API request failed:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Wallpaper data could not be loaded',
        },
      },
      { status: 500, headers: responseHeaders() },
    );
  }
}

export function miniApiResponse(
  request: NextRequest,
  operation: (options: MiniOptions, origin: string) => Promise<object>,
  cacheScope?: 'brands' | 'collections',
) {
  return observeApiRequest(request, () => respond(request, operation, cacheScope));
}
