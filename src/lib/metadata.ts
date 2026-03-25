import { cookies, headers } from 'next/headers';
import type { Language } from '@/lib/i18n';
import {
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_HEADER_NAME,
  resolveRequestLanguage,
} from '@/lib/language';

export async function resolveMetadataLanguage(): Promise<Language> {
  const headerList = await headers();
  const cookieStore = await cookies();
  const country =
    headerList.get('cf-ipcountry') ||
    headerList.get('x-country');

  return resolveRequestLanguage({
    cookieLang: cookieStore.get(LANGUAGE_COOKIE_NAME)?.value,
    headerLang: headerList.get(LANGUAGE_HEADER_NAME),
    country,
  });
}
