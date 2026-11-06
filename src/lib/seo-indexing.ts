import type { Metadata } from 'next';
import type { Language } from '@/types';
import { buildLanguageAlternates, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/lib/language';

// 非英文合集详情页的收录策略：仅品牌在该语言市场有需求且素材数量足够时收录。
// 其余语言版本仍可访问（语言切换不受影响），但输出 noindex,follow，并从 sitemap 与 hreflang 中移除。
// 品牌、列表、主题等非详情页始终五语言收录。调整名单后 sitemap 与页面 metadata 同步生效。
export const LOCALIZED_DETAIL_MIN_COUNT = 8;

const CHINA_MARKET_BRANDS = [
  'xiaomi', 'redmi', 'huawei', 'honor', 'harmonyos', 'oppo', 'oneplus', 'realme', 'vivo', 'iqoo',
  'meizu', 'smartisan', 'nubia', 'redmagic', 'zte', 'lenovo', 'black-shark', 'nio',
];

const LOCALIZED_DETAIL_BRANDS: Record<Exclude<Language, 'en'>, ReadonlySet<string>> = {
  zh: new Set(CHINA_MARKET_BRANDS),
  'zh-hant': new Set([
    ...CHINA_MARKET_BRANDS,
    'samsung', 'sony', 'asus-rog-phone', 'htc', 'google-pixel', 'nothing', 'poco', 'motorola',
  ]),
  ja: new Set([
    'sony', 'sharp', 'google-pixel', 'samsung', 'xiaomi', 'redmi', 'oppo', 'asus-rog-phone', 'motorola', 'nothing',
  ]),
  vi: new Set([
    'samsung', 'oppo', 'xiaomi', 'redmi', 'poco', 'realme', 'vivo', 'honor',
    'transsion-tecno', 'transsion-infinix', 'nokia', 'hmd', 'motorola',
  ]),
};

export function isDetailIndexable(language: Language, brand: string, count: number): boolean {
  if (language === DEFAULT_LANGUAGE) return true;
  const brands = LOCALIZED_DETAIL_BRANDS[language as Exclude<Language, 'en'>];
  return count >= LOCALIZED_DETAIL_MIN_COUNT && Boolean(brands?.has(brand));
}

export function getIndexableDetailLanguages(brand: string, count: number): Language[] {
  return SUPPORTED_LANGUAGES.filter((language) => isDetailIndexable(language, brand, count));
}

const NOINDEX_FOLLOW: Metadata['robots'] = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
};

// 详情页 metadata：canonical 始终自引用；不可索引的语言版本不输出 hreflang。
export function buildDetailIndexingMetadata(
  language: Language,
  brand: string,
  count: number,
  absolutePath: string,
  canonical: string
): Pick<Metadata, 'alternates' | 'robots'> {
  const languages = getIndexableDetailLanguages(brand, count);
  if (!languages.includes(language)) {
    return { alternates: { canonical }, robots: NOINDEX_FOLLOW };
  }
  return { alternates: { canonical, languages: buildLanguageAlternates(absolutePath, languages) } };
}
