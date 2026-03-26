import { NextRequest, NextResponse } from 'next/server';
import { getTabData } from '@/lib/data';
import { LANGUAGE_COOKIE_NAME, LANGUAGE_HEADER_NAME, resolveRequestLanguage } from '@/lib/language';

export const runtime = 'edge';


export async function GET(request: NextRequest) {
  try {
    const searchLang = request.nextUrl.searchParams.get('lang');
    const cookieLang = request.cookies.get(LANGUAGE_COOKIE_NAME)?.value ?? null;
    const headerLang = request.headers.get(LANGUAGE_HEADER_NAME);
    const country = request.headers.get('cf-ipcountry');
    const language = resolveRequestLanguage({
      searchLang,
      cookieLang,
      headerLang,
      country,
    });

    const data = getTabData(language) as unknown;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching tabs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch tab data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
