export type SourceWallpaperCategory =
  | 'iphone'
  | 'ipad'
  | 'mac'
  | 'ios'
  | 'ipados'
  | 'macos'
  | 'new-year'
  | 'wwdc';

export type BrandCategoryConfig = {
  title: string;
  slug: string;
  source: SourceWallpaperCategory;
};

export const BRAND_CATEGORIES = [
  { title: 'Google Pixel', slug: 'google-pixel', source: 'iphone' },
  { title: 'HarmonyOS', slug: 'harmonyos', source: 'ios' },
  { title: 'Honor', slug: 'honor', source: 'ipad' },
  { title: 'Huawei', slug: 'huawei', source: 'macos' },
  { title: 'Huawei MatePad', slug: 'huawei-matepad', source: 'ipados' },
  { title: 'Motorola', slug: 'motorola', source: 'mac' },
  { title: 'Transsion Infinix', slug: 'transsion-infinix', source: 'new-year' },
  { title: 'Transsion Tecno', slug: 'transsion-tecno', source: 'wwdc' },
  { title: 'OnePlus', slug: 'oneplus', source: 'iphone' },
  { title: 'Oppo', slug: 'oppo', source: 'ios' },
  { title: 'Realme', slug: 'realme', source: 'ipad' },
  { title: 'Samsung', slug: 'samsung', source: 'macos' },
  { title: 'Vivo', slug: 'vivo', source: 'ipados' },
  { title: 'Xiaomi', slug: 'xiaomi', source: 'mac' },
] as const satisfies readonly BrandCategoryConfig[];

export type WallpaperCategory = (typeof BRAND_CATEGORIES)[number]['slug'];
export type BrandCategory = (typeof BRAND_CATEGORIES)[number];

export function normalizeCategoryType(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '-');
}

export function getBrandCategoryBySlug(slug: string): BrandCategory | null {
  return BRAND_CATEGORIES.find((item) => item.slug === slug) ?? null;
}
