import { NextRequest, NextResponse } from 'next/server';
import {
  MiniApiError,
  parseMiniOptions,
  type MiniOptions,
} from '@/lib/mini-api';

const RESPONSE_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};
export async function miniApiResponse(
  request: NextRequest,
  operation: (options: MiniOptions, origin: string) => Promise<object>,
) {
  try {
    const options = parseMiniOptions(request.nextUrl.searchParams);
    const origin = new URL(
      process.env.NEXT_PUBLIC_SITE_URL || 'https://phwalls.com',
    ).origin;
    const result = await operation(options, origin);
    return NextResponse.json(
      { ...result, meta: { version: '1', language: options.language } },
      {
        headers: { ...RESPONSE_HEADERS, 'Content-Language': options.language },
      },
    );
  } catch (error) {
    if (error instanceof MiniApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status, headers: RESPONSE_HEADERS },
      );
    }
    console.error('Mini-program API request failed:', error);
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Wallpaper data could not be loaded',
        },
      },
      { status: 500, headers: RESPONSE_HEADERS },
    );
  }
}
