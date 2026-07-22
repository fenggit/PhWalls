import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { BRAND_CATEGORIES, normalizeCategoryType } from '@/lib/brands';
import {
  DEFAULT_LANGUAGE,
  getLanguageFromPath,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_HEADER_NAME,
  REQUEST_PATH_HEADER_NAME,
  resolveLanguageFromAcceptLanguage,
  resolveRequestLanguage,
  stripLanguagePrefix,
  withLanguagePath,
} from '@/lib/language';

const STATIC_PATHS = new Set([
  'sitemap.xml',
  'robots.txt',
  'llms.txt',
  'favicon.ico',
  'indexnow-key.txt',
  'manifest.json',
  'browserconfig.xml',
]);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://phwalls.com';
const SITE_ORIGIN = new URL(SITE_URL);
const BRAND_SLUGS = new Set(BRAND_CATEGORIES.map((brand) => brand.slug));

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function resolveCanonicalHost(hostname: string): string | null {
  const incoming = hostname.toLowerCase();
  const canonical = SITE_ORIGIN.hostname.toLowerCase();

  if (incoming === canonical) {
    return canonical;
  }

  if (canonical.startsWith('www.') && incoming === canonical.slice(4)) {
    return canonical;
  }

  if (!canonical.startsWith('www.') && incoming === `www.${canonical}`) {
    return canonical;
  }

  return null;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function normalizePublicPath(pathname: string): string {
  if (pathname === '/home/v1' || pathname === '/home/v1/') {
    return '/';
  }

  if (pathname === '/privacy-policy' || pathname.startsWith('/privacy-policy/')) {
    return pathname.replace('/privacy-policy', '/privacy');
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1) {
    const normalized = normalizeCategoryType(safeDecodeURIComponent(segments[0]));
    if (BRAND_SLUGS.has(normalized)) {
      return `/${normalized}`;
    }
  }

  return pathname;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const pathLanguage = getLanguageFromPath(pathname);
  const strippedPath = pathLanguage ? stripLanguagePrefix(pathname).path : pathname;
  const normalizedPath = normalizePublicPath(strippedPath);
  const trimmed = normalizedPath.replace(/^\/+|\/+$/g, '');
  const isStaticFile = Boolean(normalizedPath.match(/\.[a-z0-9]+$/i));
  const isStaticPath = STATIC_PATHS.has(trimmed);
  const isInternal =
    normalizedPath.startsWith('/_next') ||
    normalizedPath.startsWith('/api') ||
    isStaticFile;

  const canonicalHost = resolveCanonicalHost(request.nextUrl.hostname);
  const shouldCanonicalizeProtocol =
    canonicalHost !== null && request.nextUrl.protocol !== SITE_ORIGIN.protocol;

  const country =
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country');
  const acceptLanguageHeader = request.headers.get('accept-language');
  const acceptLanguage = acceptLanguageHeader
    ? resolveLanguageFromAcceptLanguage(acceptLanguageHeader)
    : null;
  const resolvedLanguage = resolveRequestLanguage({
    browserLang: acceptLanguage,
    cookieLang: request.cookies.get(LANGUAGE_COOKIE_NAME)?.value,
    country,
  });

  const preferredLanguage = pathLanguage || resolvedLanguage || DEFAULT_LANGUAGE;

  const redirectUrl = request.nextUrl.clone();
  let shouldRedirect = false;

  if (canonicalHost && redirectUrl.hostname !== canonicalHost) {
    redirectUrl.hostname = canonicalHost;
    shouldRedirect = true;
  }

  if (shouldCanonicalizeProtocol) {
    redirectUrl.protocol = SITE_ORIGIN.protocol;
    shouldRedirect = true;
  }

  if (pathLanguage) {
    const expectedPath = withLanguagePath(normalizedPath, pathLanguage);
    if (redirectUrl.pathname !== expectedPath) {
      redirectUrl.pathname = expectedPath;
      shouldRedirect = true;
    }
  } else if (!isInternal && !isStaticPath) {
    const expectedPath = withLanguagePath(normalizedPath, preferredLanguage);
    if (redirectUrl.pathname !== expectedPath) {
      redirectUrl.pathname = expectedPath;
      shouldRedirect = true;
    }
  }

  if (shouldRedirect) {
    const response = NextResponse.redirect(redirectUrl, 308);
    response.cookies.set(LANGUAGE_COOKIE_NAME, preferredLanguage, {
      maxAge: ONE_YEAR_SECONDS,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  }

  if (pathLanguage) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(LANGUAGE_HEADER_NAME, pathLanguage);
    requestHeaders.set(REQUEST_PATH_HEADER_NAME, normalizedPath);
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = normalizedPath;
    const response = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });
    response.cookies.set(LANGUAGE_COOKIE_NAME, pathLanguage, {
      maxAge: ONE_YEAR_SECONDS,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  }

  if (isStaticPath || isInternal) {
    // 静态资源与内部请求（_next、api、静态文件）不写语言 cookie：
    // 带 Set-Cookie 的响应会削弱 Cloudflare 对不可变资源的缓存。
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LANGUAGE_HEADER_NAME, preferredLanguage);
  requestHeaders.set(REQUEST_PATH_HEADER_NAME, normalizedPath);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.cookies.set(LANGUAGE_COOKIE_NAME, preferredLanguage, {
    maxAge: ONE_YEAR_SECONDS,
    path: '/',
    sameSite: 'lax',
  });
  return response;
}

export const config = {
  matcher: '/:path*',
};
