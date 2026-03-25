import { getI18nTexts, type Language } from '@/lib/i18n';
import { getWallpaperCategoryLabel, type WallpaperCategory } from '@/lib/wallpapers';
import { LanguageCode } from '@/types';
import categoryDataEn from '@/data/info/en/category-data.json';
import categoryDataZh from '@/data/info/zh/category-data.json';
import categoryDataJa from '@/data/info/ja/category-data.json';
import categoryDataVi from '@/data/info/vi/category-data.json';
import categoryDataZhHant from '@/data/info/zh-hant/category-data.json';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://phwalls.com';

type CategoryCopy = {
  title: string;
  desc: string;
  subTitle: string;
};

type CategoryDataMap = Record<string, CategoryCopy>;

const categoryDataByLang: Record<Language, CategoryDataMap> = {
  [LanguageCode.EN]: categoryDataEn as CategoryDataMap,
  [LanguageCode.ZH]: categoryDataZh as CategoryDataMap,
  [LanguageCode.JA]: categoryDataJa as CategoryDataMap,
  [LanguageCode.VI]: categoryDataVi as CategoryDataMap,
  [LanguageCode.ZH_HANT]: categoryDataZhHant as CategoryDataMap,
};

export function getCategorySeoCopy(language: Language, categoryKey: string) {
  const copyMap = categoryDataByLang[language] || categoryDataByLang[LanguageCode.EN];
  const fallbackCopyMap = categoryDataByLang[LanguageCode.EN];
  const copy = copyMap[categoryKey] || fallbackCopyMap[categoryKey];

  return {
    title: copy?.title || categoryKey,
    description: copy?.desc || '',
  };
}

export function getCategoryLabelForLanguage(language: Language, category: WallpaperCategory): string {
  void language;
  return getWallpaperCategoryLabel(category);
}

export function buildCollectionDescription(language: Language, input: {
  count: number;
  collectionName: string;
  categoryLabel: string;
}) {
  const { count, collectionName, categoryLabel } = input;
  const texts = getI18nTexts(language);
  return texts.collectionDescriptionTemplate
    .replace('{count}', String(count))
    .replace('{collectionName}', collectionName)
    .replace('{categoryLabel}', categoryLabel);
}

export const slugFromDeviceName = (name: string): string => {
  return name.replace(/\s+/g, '').toLowerCase();
};
