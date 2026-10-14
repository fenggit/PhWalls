import { NextRequest, NextResponse } from 'next/server';
import { loadDbSearchIndex } from '@/lib/wallpaper-db';
import { DEFAULT_LANGUAGE, isLanguage } from '@/lib/language';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
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
