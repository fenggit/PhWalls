import en from '@/data/language/en/seo.json';
import zh from '@/data/language/zh/seo.json';
import zhHant from '@/data/language/zh-hant/seo.json';
import ja from '@/data/language/ja/seo.json';
import vi from '@/data/language/vi/seo.json';
import type { Language } from '@/types';

export type LandingSeoCopy = {
  title: string;
  metadataTitle: string;
  description: string;
};

type LocalizedSeoCopy = {
  brands: Record<keyof typeof en.brands, LandingSeoCopy>;
  desktop: Record<keyof typeof en.desktop, LandingSeoCopy>;
  desktopHome: LandingSeoCopy;
};

// Require every locale to cover the same categories as the English copy.
const localizedSeoCopy: Record<Language, LocalizedSeoCopy> = {
  en,
  zh,
  'zh-hant': zhHant,
  ja,
  vi,
};

export function getLocalizedCategorySeoCopy(
  language: Language,
  section: 'brands' | 'desktop',
  categoryKey: string
): LandingSeoCopy | undefined {
  const categories: Partial<Record<string, LandingSeoCopy>> = localizedSeoCopy[language][section];
  return Object.prototype.hasOwnProperty.call(categories, categoryKey)
    ? categories[categoryKey]
    : undefined;
}

export function getLocalizedDesktopHomeSeoCopy(language: Language): LandingSeoCopy {
  return localizedSeoCopy[language].desktopHome;
}
