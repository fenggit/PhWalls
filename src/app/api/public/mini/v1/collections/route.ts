import type { NextRequest } from 'next/server';
import { listMiniCollections } from '@/lib/mini-api-data';
import { miniApiResponse } from '@/lib/mini-api-response';
export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export function GET(request: NextRequest) {
  return miniApiResponse(
    request,
    (options, origin) => listMiniCollections(options, origin),
    'collections',
  );
}
