import type { NextRequest } from 'next/server';
import { parseMiniId } from '@/lib/mini-api';
import { getMiniWallpaper } from '@/lib/mini-api-data';
import { miniApiResponse } from '@/lib/mini-api-response';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return miniApiResponse(request, async (options, origin) => {
    const { id } = await context.params;
    parseMiniId(id, true);
    return getMiniWallpaper(id, options, origin);
  });
}
