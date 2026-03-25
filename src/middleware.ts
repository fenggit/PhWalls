import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  DEFAULT_LANGUAGE,
  getLanguageFromPath,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_HEADER_NAME,
  resolveRequestLanguage,
  stripLanguagePrefix,
} from '@/lib/language';

const STATIC_PATHS = new Set([
  'sitemap.xml',
  'robots.txt',
  'ads.txt',
  'llms.txt',
  'favicon.ico',
  'indexnow-key.txt',
  'manifest.json',
  'browserconfig.xml',
]);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  const isStaticFile = Boolean(pathname.match(/\.[a-z0-9]+$/i));
  const country =
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country');
  const resolvedLanguage = resolveRequestLanguage({
    cookieLang: request.cookies.get(LANGUAGE_COOKIE_NAME)?.value,
    country,
  });

  if (pathname === '/privacy-policy' || pathname.startsWith('/privacy-policy/')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = pathname.replace('/privacy-policy', '/privacy');
    const response = NextResponse.redirect(redirectUrl, 308);
    response.cookies.set(LANGUAGE_COOKIE_NAME, resolvedLanguage, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  const pathLanguage = getLanguageFromPath(pathname);
  if (pathLanguage) {
    requestHeaders.set(LANGUAGE_HEADER_NAME, pathLanguage);
    const stripped = stripLanguagePrefix(pathname).path;
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = stripped === '/' ? '/' : stripped;
    const response = NextResponse.rewrite(rewriteUrl, {
      request: {
        headers: requestHeaders,
      },
    });
    response.cookies.set(LANGUAGE_COOKIE_NAME, pathLanguage, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  }

  const isInternal =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    isStaticFile;

  if (STATIC_PATHS.has(trimmed)) {
    const response = NextResponse.next();
    response.cookies.set(LANGUAGE_COOKIE_NAME, resolvedLanguage, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  }

  if (isInternal) {
    const response = NextResponse.next();
    response.cookies.set(LANGUAGE_COOKIE_NAME, resolvedLanguage, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });
    return response;
  }

  const preferredLanguage = resolvedLanguage || DEFAULT_LANGUAGE;
  requestHeaders.set(LANGUAGE_HEADER_NAME, preferredLanguage);
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.cookies.set(LANGUAGE_COOKIE_NAME, preferredLanguage, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    sameSite: 'lax',
  });
  return response;
}

export const config = {
  matcher: '/:path*',
};
