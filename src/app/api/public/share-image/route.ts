import { NextRequest, NextResponse } from 'next/server';
import { R2Service } from '@/lib/services/r2';
import { getCurrentEnvironment } from '@/lib/config/environments';
import { sanitizeWallpaperKey } from '@/lib/wallpaper-key';

export const runtime = 'edge';

function isAllowedShareImageKey(key: string): boolean {
  return Boolean(sanitizeWallpaperKey(key) && key.includes('/compress/'));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawKey = searchParams.get('key');

    if (!rawKey) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const key = sanitizeWallpaperKey(rawKey);
    if (!key || !isAllowedShareImageKey(key)) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }

    const environment = getCurrentEnvironment();
    const r2Service = new R2Service(environment);

    if (environment.r2.isPrivate) {
      const imageUrl = await r2Service.getPrivateFileUrl(
        key,
        environment.r2.urlExpires,
        undefined,
        false
      );

      return NextResponse.redirect(imageUrl, 302);
    }

    const publicUrl = r2Service.getPublicFileUrl(key);
    const upstream = await fetch(publicUrl, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: 'Failed to fetch share image' }, { status: upstream.status });
    }

    const headers = new Headers();
    headers.set('Content-Type', upstream.headers.get('content-type') || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    headers.set('Access-Control-Allow-Origin', request.nextUrl.origin);
    headers.set('Vary', 'Origin');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error fetching share image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share image' },
      { status: 500 }
    );
  }
}
