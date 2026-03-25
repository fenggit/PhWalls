import { LanguageCode, type Language } from '@/types';

export const SUPPORTED_LANGUAGES: Language[] = [
  LanguageCode.EN,
  LanguageCode.ZH,
  LanguageCode.JA,
  LanguageCode.VI,
  LanguageCode.ZH_HANT,
];
export const DEFAULT_LANGUAGE: Language = LanguageCode.EN;
export const LANGUAGE_LOCAL_STORAGE_KEY = 'phwalls-language';
export const LANGUAGE_COOKIE_NAME = 'phwalls-lang';
export const LANGUAGE_HEADER_NAME = 'x-phwalls-lang';
export const LANGUAGE_PATH_SEGMENTS: Record<Language, string> = {
  [LanguageCode.EN]: LanguageCode.EN,
  [LanguageCode.ZH]: LanguageCode.ZH,
  [LanguageCode.JA]: LanguageCode.JA,
  [LanguageCode.VI]: LanguageCode.VI,
  [LanguageCode.ZH_HANT]: LanguageCode.ZH_HANT,
};

const LANGUAGE_TO_LOCALE: Record<Language, string> = {
  [LanguageCode.EN]: 'en_US',
  [LanguageCode.ZH]: 'zh_CN',
  [LanguageCode.JA]: 'ja_JP',
  [LanguageCode.VI]: 'vi_VN',
  [LanguageCode.ZH_HANT]: 'zh_HK',
};

const ACCEPT_LANGUAGE_MAP: Array<{ pattern: RegExp; language: Language }> = [
  { pattern: /^zh-(hk|mo|tw)/i, language: LanguageCode.ZH_HANT },
  { pattern: /^zh/i, language: LanguageCode.ZH },
  { pattern: /^ja/i, language: LanguageCode.JA },
  { pattern: /^vi/i, language: LanguageCode.VI },
  { pattern: /^en/i, language: LanguageCode.EN },
];

export function isLanguage(value: string | null | undefined): value is Language {
  return Boolean(value && SUPPORTED_LANGUAGES.includes(value as Language));
}

export function normalizeLanguage(value: string | null | undefined): Language | null {
  return isLanguage(value) ? value : null;
}

export function resolveLanguageFromCountry(countryCode: string | null | undefined): Language | null {
  if (!countryCode) return null;
  const normalized = countryCode.trim().toUpperCase();
  if (!normalized || normalized === 'XX' || normalized === 'T1') return null;

  switch (normalized) {
    case 'CN':
    case 'SG':
      return LanguageCode.ZH;
    case 'TW':
    case 'HK':
    case 'MO':
      return LanguageCode.ZH_HANT;
    case 'JP':
      return LanguageCode.JA;
    case 'VN':
      return LanguageCode.VI;
    default:
      return null;
  }
}

export function resolveLanguageFromAcceptLanguage(value: string | null | undefined): Language {
  if (!value) {
    return DEFAULT_LANGUAGE;
  }

  const candidates = value
    .split(',')
    .map((part) => part.trim().split(';')[0])
    .filter(Boolean);

  for (const candidate of candidates) {
    for (const entry of ACCEPT_LANGUAGE_MAP) {
      if (entry.pattern.test(candidate)) {
        return entry.language;
      }
    }
  }

  return DEFAULT_LANGUAGE;
}

export function getLanguageFromPath(pathname: string): Language | null {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const segment = normalized.split('/').filter(Boolean)[0];
  if (!segment) return null;

  const match = (Object.keys(LANGUAGE_PATH_SEGMENTS) as Language[]).find(
    (lang) => LANGUAGE_PATH_SEGMENTS[lang] === segment
  );
  return match || null;
}

export function stripLanguagePrefix(pathname: string): { language: Language | null; path: string } {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const detected = getLanguageFromPath(normalized);
  if (!detected) {
    return { language: null, path: normalized };
  }

  const segments = normalized.split('/').filter(Boolean);
  const [, ...rest] = segments;
  const path = `/${rest.join('/')}`;
  return { language: detected, path: path === '/' ? '/' : path };
}

export function withLanguagePath(pathname: string, language: Language): string {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const { path } = stripLanguagePrefix(normalized);
  const prefix = `/${LANGUAGE_PATH_SEGMENTS[language]}`;
  return path === '/' ? prefix : `${prefix}${path}`;
}

export function withLanguageUrl(input: string, language: Language): string {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    const url = new URL(input);
    url.pathname = withLanguagePath(url.pathname, language);
    return url.toString();
  }
  return withLanguagePath(input, language);
}

// Backward compatibility for legacy callers that still append `lang` query params.
export function withLanguageParam(input: string, language: Language): string {
  const lang = normalizeLanguage(language) || DEFAULT_LANGUAGE;

  if (input.startsWith('http://') || input.startsWith('https://')) {
    const url = new URL(input);
    url.searchParams.set('lang', lang);
    return url.toString();
  }

  const [pathname, hash = ''] = input.split('#', 2);
  const [base, query = ''] = pathname.split('?', 2);
  const params = new URLSearchParams(query);
  params.set('lang', lang);
  const queryString = params.toString();
  const suffix = hash ? `#${hash}` : '';
  return queryString ? `${base}?${queryString}${suffix}` : `${base}${suffix}`;
}

export function resolveRequestLanguage(input: {
  searchLang?: string | null;
  cookieLang?: string | null;
  headerLang?: string | null;
  country?: string | null;
}): Language {
  return (
    normalizeLanguage(input.searchLang) ||
    normalizeLanguage(input.cookieLang) ||
    normalizeLanguage(input.headerLang) ||
    resolveLanguageFromCountry(input.country) ||
    DEFAULT_LANGUAGE
  );
}

export function buildLanguageAlternates(path: string) {
  const build = (value: string, language: Language) => withLanguageUrl(value, language);
  return {
    'x-default': withLanguageUrl(path, LanguageCode.EN),
    en: build(path, LanguageCode.EN),
    'en-US': build(path, LanguageCode.EN),
    zh: build(path, LanguageCode.ZH),
    'zh-CN': build(path, LanguageCode.ZH),
    ja: build(path, LanguageCode.JA),
    'ja-JP': build(path, LanguageCode.JA),
    vi: build(path, LanguageCode.VI),
    'vi-VN': build(path, LanguageCode.VI),
    'zh-Hant': build(path, LanguageCode.ZH_HANT),
    'zh-Hans': build(path, LanguageCode.ZH),
  };
}

export function getOpenGraphLocaleForLanguage(language: Language): string {
  return LANGUAGE_TO_LOCALE[language];
}
