import { cookies, headers } from 'next/headers';
import type { Language } from '@/lib/i18n';
import {
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_HEADER_NAME,
  LANGUAGE_PREFERENCE_COOKIE_NAME,
  LANGUAGE_PREFERENCE_MARKER_VALUE,
  resolveRequestLanguage,
} from '@/lib/language';

export async function resolveMetadataLanguage(): Promise<Language> {
  const headerList = await headers();
  const cookieStore = await cookies();
  const country =
    headerList.get('cf-ipcountry') ||
    headerList.get('x-country');
  const hasExplicitLanguagePreference =
    cookieStore.get(LANGUAGE_PREFERENCE_COOKIE_NAME)?.value ===
    LANGUAGE_PREFERENCE_MARKER_VALUE;

  return resolveRequestLanguage({
    cookieLang: hasExplicitLanguagePreference
      ? cookieStore.get(LANGUAGE_COOKIE_NAME)?.value
      : null,
    headerLang: headerList.get(LANGUAGE_HEADER_NAME),
    country,
  });
}
