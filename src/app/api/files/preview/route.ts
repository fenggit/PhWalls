import { NextRequest, NextResponse } from 'next/server';
import { R2Service } from '@/lib/services/r2';
import { getCurrentEnvironment } from '@/lib/config/environments';
import { sanitizeWallpaperDownloadKey } from '@/lib/wallpaper-key';
import { isPublishedWallpaperKey } from '@/lib/wallpaper-db';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const key = sanitizeWallpaperDownloadKey(request.nextUrl.searchParams.get('key'));
    if (!key || !/\.(mp4|webm)$/i.test(key) || !await isPublishedWallpaperKey(key, true)) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    const range = request.headers.get('range');
    if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) {
      return new NextResponse(null, { status: 416 });
    }
    const environment = getCurrentEnvironment();
    const r2 = new R2Service(environment);
    // Prefer the browser preview; older uploads can still play their original when no preview exists.
    const candidates = [key.replace('/origin/', '/preview/'), key];
    let upstream: Response | undefined;
    for (let index = 0; index < candidates.length; index++) {
      const candidate = candidates[index];
      // Keep both sources inside the authorized proxy; never expose signed storage URLs.
      const url = await r2.getPrivateFileUrl(candidate, environment.r2.urlExpires);
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          upstream = await fetch(url, { headers: range ? { Range: range } : {}, signal: request.signal });
          if (upstream.status >= 500 && attempt === 0) {
            await upstream.body?.cancel();
            continue;
          }
          break;
        } catch (error) {
          if (attempt === 1 || request.signal.aborted) throw error;
        }
      }
      if (upstream?.status === 404 && index === 0) { await upstream.body?.cancel(); continue; }
      break;
    }
    if (!upstream) throw new Error('Storage response unavailable');
    if (!upstream.ok && upstream.status !== 416) {
      return NextResponse.json({ error: 'Video preview unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
    }
    const responseHeaders = new Headers({
      'Content-Type': upstream.headers.get('content-type') || 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Cache-Control': upstream.status === 416 ? 'no-store' : 'public, max-age=3600',
    });
    for (const name of ['content-length', 'content-range', 'etag', 'last-modified']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new NextResponse(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error('Video preview failed:', error);
    return NextResponse.json({ error: 'Video preview unavailable' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
