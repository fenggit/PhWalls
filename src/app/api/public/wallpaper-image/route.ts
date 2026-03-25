import { NextRequest, NextResponse } from 'next/server';
import { R2Service } from '@/lib/services/r2';
import { getCurrentEnvironment } from '@/lib/config/environments';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const environment = getCurrentEnvironment();

    if (!environment.r2.isPrivate) {
      return NextResponse.json(
        { error: 'Public buckets require custom domain configuration. Please set R2_IS_PRIVATE_PROD=true to use signed URLs.' },
        { status: 500 }
      );
    }

    const r2Service = new R2Service(environment);
    const fileUrl = await r2Service.getPrivateFileUrl(
      key,
      environment.r2.urlExpires,
      undefined,
      false
    );

    const fileResponse = await fetch(fileUrl, { method: 'GET' });
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
    }

    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';
    const contentLength = fileResponse.headers.get('content-length');
    const etag = fileResponse.headers.get('etag');
    const lastModified = fileResponse.headers.get('last-modified');

    return new NextResponse(fileResponse.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000, immutable',
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
        ...(etag ? { ETag: etag } : {}),
        ...(lastModified ? { 'Last-Modified': lastModified } : {}),
      },
    });
  } catch (error) {
    console.error('Error fetching wallpaper image:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch wallpaper image',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
