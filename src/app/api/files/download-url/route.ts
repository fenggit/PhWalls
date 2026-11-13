import { observeApiRequest } from '@/lib/api-monitor';
import { NextRequest, NextResponse } from 'next/server';
import { sanitizeWallpaperDownloadKey } from '@/lib/wallpaper-key';
import { isPublishedWallpaperKey } from '@/lib/wallpaper-db';

export const runtime = 'edge';

async function handlePOST(request: NextRequest) {
  try {
    const body = (await request.json()) as { key?: string };
    const { key: rawKey } = body;

    if (!rawKey) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    const key = sanitizeWallpaperDownloadKey(rawKey);
    if (!key || !await isPublishedWallpaperKey(key, true)) {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }

    const downloadUrl = `/api/files/download?key=${encodeURIComponent(key)}`;

    return NextResponse.json({
      success: true,
      url: downloadUrl,
      filename: key.split('/').pop() || 'download'
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate download URL',
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export function POST(request: NextRequest) {
  return observeApiRequest(request, () => handlePOST(request));
}
