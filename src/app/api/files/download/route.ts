import { NextRequest } from 'next/server';
import { wallpaperDownload } from '@/lib/wallpaper-download';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  return wallpaperDownload(request, 'Failed to download file');
}
