import { getI18nTexts, type Language } from '@/lib/i18n';
import { getTabData } from '@/lib/data';
import { getWallpaperCategoryLabel, type WallpaperCategory } from '@/lib/wallpaper-data';
import { getBrandCategoryBySlug, normalizeCategoryType } from '@/lib/brands';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://phwalls.com';

export function getCategorySeoCopy(
  language: Language,
  categoryKey: string,
  collectionCount?: number
) {
  const brand = getBrandCategoryBySlug(categoryKey);
  const localizedTab = getTabData(language).find(
    (tab) => normalizeCategoryType(tab.type) === brand?.slug
  );
  const label = localizedTab?.title.trim() || brand?.title || categoryKey;
  const texts = getI18nTexts(language);

  return {
    title: texts.brandCategorySeoTitleTemplate.replace('{brand}', label),
    description: texts.brandCategorySeoDescriptionTemplate.replace('{brand}', label),
    subtitle:
      collectionCount === undefined
        ? ''
        : texts.brandCategorySeoSubtitleTemplate
            .replace('{count}', String(collectionCount))
            .replace('{brand}', label),
  };
}

export function getCategoryLabelForLanguage(language: Language, category: WallpaperCategory): string {
  const brand = getBrandCategoryBySlug(category);
  const localizedTab = getTabData(language).find(
    (tab) => normalizeCategoryType(tab.type) === brand?.slug
  );

  return localizedTab?.title.trim() || getWallpaperCategoryLabel(category);
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
