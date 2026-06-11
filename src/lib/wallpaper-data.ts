import { BRAND_CATEGORIES, type WallpaperCategory } from '@/lib/brands';

export type { WallpaperCategory } from '@/lib/brands';

export type WallpaperAsset = {
  name: string;
  type: string;
  size: string;
  originPath: string;
  compressPath: string;
  tag: string;
};

export type WallpaperCollection = {
  name: string;
  date: string;
  item: WallpaperAsset[];
};

export type WallpaperCollectionEntry = {
  category: WallpaperCategory;
  collection: WallpaperCollection;
};

// 按品牌的惰性数据加载器：此模块不静态 import 任何品牌 JSON，
// 只有被实际调用的 import() 才会触发对应 JSON 的解析。
// 这样品牌页 / 详情页等 Edge Function 冷启动时只解析所需的单个品牌数据，
// 而不是全部 2.5MB JSON，显著降低单请求 CPU 时间。
const brandLoaders: Record<string, () => Promise<WallpaperCollection[]>> = {
  android: () => import('@/data/android.json').then((m) => m.default as WallpaperCollection[]),
  'google-pixel': () => import('@/data/google pixel.json').then((m) => m.default as WallpaperCollection[]),
  harmonyos: () => import('@/data/harmonyos.json').then((m) => m.default as WallpaperCollection[]),
  honor: () => import('@/data/honor.json').then((m) => m.default as WallpaperCollection[]),
  huawei: () => import('@/data/huawei.json').then((m) => m.default as WallpaperCollection[]),
  'huawei-matepad': () => import('@/data/huawei matepad.json').then((m) => m.default as WallpaperCollection[]),
  motorola: () => import('@/data/motorola.json').then((m) => m.default as WallpaperCollection[]),
  nokia: () => import('@/data/nokia.json').then((m) => m.default as WallpaperCollection[]),
  nothing: () => import('@/data/nothing.json').then((m) => m.default as WallpaperCollection[]),
  oneplus: () => import('@/data/oneplus.json').then((m) => m.default as WallpaperCollection[]),
  oppo: () => import('@/data/oppo.json').then((m) => m.default as WallpaperCollection[]),
  realme: () => import('@/data/realme.json').then((m) => m.default as WallpaperCollection[]),
  samsung: () => import('@/data/samsung.json').then((m) => m.default as WallpaperCollection[]),
  sony: () => import('@/data/sony.json').then((m) => m.default as WallpaperCollection[]),
  'transsion-infinix': () => import('@/data/transsion infinix.json').then((m) => m.default as WallpaperCollection[]),
  'transsion-tecno': () => import('@/data/transsion tecno.json').then((m) => m.default as WallpaperCollection[]),
  vivo: () => import('@/data/vivo.json').then((m) => m.default as WallpaperCollection[]),
  xiaomi: () => import('@/data/xiaomi.json').then((m) => m.default as WallpaperCollection[]),
};

export const WALLPAPER_BRAND_SLUGS: WallpaperCategory[] = Object.keys(brandLoaders);

export function isWallpaperCategory(value: string): value is WallpaperCategory {
  return Object.prototype.hasOwnProperty.call(brandLoaders, value);
}

// 惰性加载单个品牌的壁纸集合（仅解析该品牌 JSON）。
export async function loadWallpaperCollections(category: string): Promise<WallpaperCollection[]> {
  const loader = brandLoaders[category];
  if (!loader) {
    return [];
  }
  return loader();
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

// 惰性查找单个品牌下的某个壁纸集合（仅解析该品牌 JSON）。
export async function loadWallpaperCollection(
  category: string,
  slug: string
): Promise<WallpaperCollection | null> {
  const collections = await loadWallpaperCollections(category);
  return collections.find((collection) => slugifyWallpaperName(collection.name) === slug) || null;
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
