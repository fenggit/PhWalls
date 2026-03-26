import tabDataEn from '@/data/language/en/tab.json';

type RawTabCategory = {
  title: string;
  type: string;
  link?: string;
};

export type BrandCategory = {
  title: string;
  type: string;
  slug: string;
};

export type WallpaperCategory = string;

export function normalizeCategoryType(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '-');
}

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const BRAND_CATEGORIES: BrandCategory[] = (tabDataEn as RawTabCategory[])
  .filter((item) => !item.link)
  .map((item) => ({
    title: item.title,
    type: item.type,
    slug: normalizeCategoryType(item.type),
  }));

export function getBrandCategoryBySlug(slug: string): BrandCategory | null {
  const normalized = normalizeCategoryType(safeDecodeURIComponent(slug));
  return (
    BRAND_CATEGORIES.find(
      (item) => item.slug === normalized || normalizeCategoryType(item.type) === normalized
    ) ?? null
  );
}

export function buildBrandPath(type: string): string {
  return `/${encodeURIComponent(type)}`;
}
