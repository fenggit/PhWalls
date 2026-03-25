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

    const filename = key.split('/').pop() || 'download';
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(fileResponse.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename.replace(/[^\x00-\x7F]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-cache',
        ...(fileResponse.headers.get('content-length') && {
          'Content-Length': fileResponse.headers.get('content-length')!,
        }),
      },
    });
  } catch (error) {
    console.error('Error downloading wallpaper:', error);
    return NextResponse.json(
      {
        error: 'Failed to download wallpaper',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
