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
export const LANGUAGE_PREFERENCE_LOCAL_STORAGE_KEY = 'phwalls-language-selected';
export const LANGUAGE_PREFERENCE_COOKIE_NAME = 'phwalls-lang-selected';
export const LANGUAGE_PREFERENCE_MARKER_VALUE = '1';
export const LANGUAGE_HEADER_NAME = 'x-phwalls-lang';
export const REQUEST_PATH_HEADER_NAME = 'x-phwalls-path';
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
  { pattern: /^zh-(hant|hk|mo|tw)/i, language: LanguageCode.ZH_HANT },
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

export function resolveLanguageFromAcceptLanguage(value: string | null | undefined): Language | null {
  if (!value) {
    return null;
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

  return null;
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
  browserLang?: string | null;
}): Language {
  return (
    normalizeLanguage(input.searchLang) ||
    normalizeLanguage(input.headerLang) ||
    normalizeLanguage(input.cookieLang) ||
    normalizeLanguage(input.browserLang) ||
    DEFAULT_LANGUAGE
  );
}

// 每种站点语言只输出一个 hreflang 代码；HTML 与 sitemap 共用，避免两处集合不一致。
export const HREFLANG_CODES: Record<Language, string> = {
  [LanguageCode.EN]: 'en',
  [LanguageCode.ZH]: 'zh-Hans',
  [LanguageCode.JA]: 'ja',
  [LanguageCode.VI]: 'vi',
  [LanguageCode.ZH_HANT]: 'zh-Hant',
};

// languages 只能包含可索引的语言版本；英文不可索引时不输出 x-default。
export function buildLanguageAlternates(path: string, languages: readonly Language[] = SUPPORTED_LANGUAGES) {
  const alternates: Record<string, string> = {};
  for (const language of SUPPORTED_LANGUAGES) {
    if (languages.includes(language)) {
      alternates[HREFLANG_CODES[language]] = withLanguageUrl(path, language);
    }
  }
  if (languages.includes(DEFAULT_LANGUAGE)) {
    alternates['x-default'] = withLanguageUrl(path, DEFAULT_LANGUAGE);
  }
  return alternates;
}

export function getOpenGraphLocaleForLanguage(language: Language): string {
  return LANGUAGE_TO_LOCALE[language];
}
