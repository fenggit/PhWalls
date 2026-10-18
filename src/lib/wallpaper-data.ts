import { BRAND_CATEGORIES, type WallpaperCategory } from '@/lib/brands';

export type { WallpaperCategory } from '@/lib/brands';

export type WallpaperAsset = {
  id?: string;
  tags?: string[];
  category?: string;
  name: string;
  type: string;
  size: string;
  originPath: string;
  compressPath: string;
  tag: string;
  width?: number | null;
  height?: number | null;
};

export type WallpaperCollection = {
  deviceName?: string;
  deviceCategory?: string;
  mediaType?: 'static' | 'dynamic';
  deviceId?: string;
  name: string;
  slug?: string;
  seoTitle?: string | null;
  description?: string | null;
  date: string;
  item: WallpaperAsset[];
  // 首页与品牌页轻量索引：集合内壁纸总数。
  // 完整数据不带此字段，按 item.length 计算即可。
  count?: number;
};

export type WallpaperCollectionEntry = {
  category: WallpaperCategory;
  collection: WallpaperCollection;
};

// 品牌识别来自导航配置；壁纸内容统一由 D1 服务读取。
export const WALLPAPER_BRAND_SLUGS: WallpaperCategory[] = BRAND_CATEGORIES.map((brand) => brand.slug);

export function isWallpaperCategory(value: string): value is WallpaperCategory {
  return WALLPAPER_BRAND_SLUGS.includes(value);
}

export function slugifyWallpaperName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildWallpaperDetailPath(category: WallpaperCategory, name: string): string {
  return `/wallpapers/${category}/${slugifyWallpaperName(name)}`;
}

export function parseWallpaperDate(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parts = value.split('/').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1] || 1);
  const day = Number(parts[2] || 1);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getWallpaperCategoryLabel(category: WallpaperCategory): string {
  return BRAND_CATEGORIES.find((item) => item.slug === category)?.title || category;
}
