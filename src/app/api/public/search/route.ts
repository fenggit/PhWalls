import { observeApiRequest } from '@/lib/api-monitor';
import { NextRequest, NextResponse } from 'next/server';
import { loadDbSearchIndex } from '@/lib/wallpaper-db';
import { DEFAULT_LANGUAGE, isLanguage } from '@/lib/language';

export const runtime = 'edge';

async function handleGET(request: NextRequest) {
  const language = request.nextUrl.searchParams.get('lang') || DEFAULT_LANGUAGE;
  if (!isLanguage(language)) {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
  }
  try {
    return NextResponse.json(await loadDbSearchIndex(language), {
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=60' },
    });
  } catch {
    console.error('Wallpaper search database unavailable');
    return NextResponse.json({ error: 'Search unavailable' }, {
      status: 503, headers: { 'Cache-Control': 'no-store' },
    });
  }
}

export function GET(request: NextRequest) {
  return observeApiRequest(request, () => handleGET(request));
}
