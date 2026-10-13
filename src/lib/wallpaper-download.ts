import { NextRequest, NextResponse } from 'next/server';
import { R2Service } from '@/lib/services/r2';
import { getCurrentEnvironment } from '@/lib/config/environments';
import { DOWNLOAD_CACHE_CONTROL } from '@/lib/cache-control';
import { sanitizeWallpaperDownloadKey } from '@/lib/wallpaper-key';
import { isPublishedWallpaperKey } from '@/lib/wallpaper-db';

// Headers measure work up to the response, not the subsequent body transfer.
// Stream logs record bytes handed to the response; they cannot confirm a client save.
export async function wallpaperDownload(request: NextRequest, errorMessage: string) {
  const started = performance.now();
  const timings: Record<string, number> = {};
  let upstreamCache = 'UNKNOWN';
  let upstreamRay: string | null = null;
  let upstreamStatus: number | null = null;
  let phase = 'validation';
  let errorCode = 'PUBLICATION_CHECK';
  const headers = () => ({
    'Cache-Control': DOWNLOAD_CACHE_CONTROL,
    'Server-Timing': [
      ...Object.entries(timings).map(([name, duration]) => `${name};dur=${duration.toFixed(2)}`),
      `headers;dur=${(performance.now() - started).toFixed(2)}`,
    ].join(', '),
    'X-Wallpaper-Upstream-Cache': upstreamCache,
  });
  const log = (outcome: string, bytes: number, headersMs: number, failureCode?: string) => {
    const entry = JSON.stringify({
      event: 'wallpaper_download', outcome, bytes,
      validation_ms: timings.validation, source_ms: timings.source,
      upstream_ms: timings.upstream, headers_ms: headersMs,
      total_ms: Number((performance.now() - started).toFixed(2)),
      request_ray: request.headers.get('cf-ray'),
      upstream_ray: upstreamRay, upstream_cache: upstreamCache,
      upstream_status: upstreamStatus, phase, error_code: failureCode,
    });
    if (outcome === 'error') console.error(entry);
    else console.info(entry);
  };

  try {
    const rawKey = request.nextUrl.searchParams.get('key');
    if (!rawKey) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400, headers: headers() });
    }

    const validationStarted = performance.now();
    const key = sanitizeWallpaperDownloadKey(rawKey);
    let published = false;
    try {
      // Always check live publication state before retrieving any original.
      published = Boolean(key && await isPublishedWallpaperKey(key, true));
    } finally {
      timings.validation = performance.now() - validationStarted;
    }
    if (!key || !published) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400, headers: headers() });
    }

    const sourceStarted = performance.now();
    phase = 'source';
    errorCode = 'SOURCE_URL';
    const environment = getCurrentEnvironment();
    const r2Service = new R2Service(environment);
    const fileUrl = environment.r2.isPrivate
      ? await r2Service.getPrivateFileUrl(key, environment.r2.urlExpires, undefined, false)
      : r2Service.getPublicFileUrl(key);
    timings.source = performance.now() - sourceStarted;

    const upstreamStarted = performance.now();
    phase = 'upstream';
    errorCode = 'UPSTREAM_FETCH';
    let fileResponse: Response;
    try {
      fileResponse = await fetch(fileUrl, { method: 'GET', signal: request.signal });
    } finally {
      timings.upstream = performance.now() - upstreamStarted;
    }
    const cacheStatus = fileResponse.headers.get('cf-cache-status') || '';
    if (/^(HIT|MISS|EXPIRED|STALE|BYPASS|DYNAMIC|REVALIDATED|UPDATING)$/i.test(cacheStatus)) {
      upstreamCache = cacheStatus.toUpperCase();
    }
    upstreamRay = fileResponse.headers.get('cf-ray');
    upstreamStatus = fileResponse.status;
    if (!fileResponse.ok || !fileResponse.body) {
      errorCode = fileResponse.ok ? 'UPSTREAM_BODY_MISSING' : 'UPSTREAM_HTTP';
      await fileResponse.body?.cancel();
      throw new Error('Original unavailable');
    }

    const filename = key.split('/').pop() || 'download';
    const responseHeaders = headers();
    const headersMs = performance.now() - started;
    phase = 'transfer';
    const reader = fileResponse.body.getReader();
    let bytes = 0;
    let finished = false;
    const finish = (outcome: string) => {
      if (finished) return;
      finished = true;
      log(outcome, bytes, headersMs, outcome === 'error' ? 'TRANSFER_STREAM' : undefined);
    };
    // One chunk per pull preserves backpressure and propagates cancellation.
    const body = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const chunk = await reader.read();
          if (finished) return;
          if (chunk.done) {
            reader.releaseLock();
            controller.close();
            finish('complete');
          } else {
            bytes += chunk.value.byteLength;
            controller.enqueue(chunk.value);
          }
        } catch (error) {
          if (finished) return;
          reader.releaseLock();
          controller.error(error);
          finish('error');
        }
      },
      async cancel(reason) {
        finish('cancelled');
        try {
          await reader.cancel(reason);
        } finally {
          reader.releaseLock();
        }
      },
    });
    const contentLength = fileResponse.headers.get('content-length');
    // fetch may decode an encoded body, making the upstream length unsuitable.
    const encoded = fileResponse.headers.get('content-encoding');
    return new NextResponse(body, {
      headers: {
        ...responseHeaders,
        'Content-Type': fileResponse.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename.replace(/[^\x00-\x7F]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        ...(contentLength && (!encoded || encoded === 'identity') ? { 'Content-Length': contentLength } : {}),
      },
    });
  } catch {
    // Fixed codes retain actionable failure reasons without logging signed URLs.
    log(request.signal.aborted ? 'cancelled' : 'error', 0, performance.now() - started,
      request.signal.aborted ? 'REQUEST_ABORTED' : errorCode);
    return NextResponse.json({ error: errorMessage }, { status: 500, headers: headers() });
  }
}
