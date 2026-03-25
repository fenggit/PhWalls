import { getI18nTexts, type Language } from '@/lib/i18n';
import { getWallpaperCategoryLabel, type WallpaperCategory } from '@/lib/wallpapers';
import { getBrandCategoryBySlug } from '@/lib/brands';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://phwalls.com';

export function getCategorySeoCopy(language: Language, categoryKey: string) {
  void language;
  const brand = getBrandCategoryBySlug(categoryKey);
  const label = brand?.title || categoryKey;

  return {
    title: `${label} Wallpapers`,
    description: `Download official ${label} built-in wallpapers in HD quality. Free and watermark-free.`,
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
