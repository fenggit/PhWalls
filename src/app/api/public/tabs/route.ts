import { NextRequest, NextResponse } from 'next/server';
import { getTabData } from '@/lib/data';
import {
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_HEADER_NAME,
  LANGUAGE_PREFERENCE_COOKIE_NAME,
  LANGUAGE_PREFERENCE_MARKER_VALUE,
  resolveLanguageFromAcceptLanguage,
  resolveRequestLanguage,
} from '@/lib/language';

export const runtime = 'edge';


export async function GET(request: NextRequest) {
  try {
    const searchLang = request.nextUrl.searchParams.get('lang');
    const hasExplicitLanguagePreference =
      request.cookies.get(LANGUAGE_PREFERENCE_COOKIE_NAME)?.value ===
      LANGUAGE_PREFERENCE_MARKER_VALUE;
    const cookieLang = hasExplicitLanguagePreference
      ? request.cookies.get(LANGUAGE_COOKIE_NAME)?.value ?? null
      : null;
    const headerLang = request.headers.get(LANGUAGE_HEADER_NAME);
    const browserLang = resolveLanguageFromAcceptLanguage(request.headers.get('accept-language'));
    const country = request.headers.get('cf-ipcountry');
    const language = resolveRequestLanguage({
      searchLang,
      headerLang,
      browserLang,
      cookieLang,
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
