import googlePixelData from '@/data/google pixel.json';
import harmonyosData from '@/data/harmonyos.json';
import honorData from '@/data/honor.json';
import huaweiData from '@/data/huawei.json';
import huaweiMatepadData from '@/data/huawei matepad.json';
import motorolaData from '@/data/motorola.json';
import nothingData from '@/data/nothing.json';
import oneplusData from '@/data/oneplus.json';
import oppoData from '@/data/oppo.json';
import realmeData from '@/data/realme.json';
import samsungData from '@/data/samsung.json';
import transsionInfinixData from '@/data/transsion infinix.json';
import transsionTecnoData from '@/data/transsion tecno.json';
import vivoData from '@/data/vivo.json';
import xiaomiData from '@/data/xiaomi.json';
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

const dataSources: Record<string, WallpaperCollection[]> = {
  'google-pixel': googlePixelData as WallpaperCollection[],
  harmonyos: harmonyosData as WallpaperCollection[],
  honor: honorData as WallpaperCollection[],
  huawei: huaweiData as WallpaperCollection[],
  'huawei-matepad': huaweiMatepadData as WallpaperCollection[],
  motorola: motorolaData as WallpaperCollection[],
  nothing: nothingData as WallpaperCollection[],
  oneplus: oneplusData as WallpaperCollection[],
  oppo: oppoData as WallpaperCollection[],
  realme: realmeData as WallpaperCollection[],
  samsung: samsungData as WallpaperCollection[],
  'transsion-infinix': transsionInfinixData as WallpaperCollection[],
  'transsion-tecno': transsionTecnoData as WallpaperCollection[],
  vivo: vivoData as WallpaperCollection[],
  xiaomi: xiaomiData as WallpaperCollection[],
};

const wallpaperCollections: Record<WallpaperCategory, WallpaperCollection[]> = BRAND_CATEGORIES.reduce(
  (acc, brand) => {
    acc[brand.slug] = dataSources[brand.slug] || [];
    return acc;
  },
  {} as Record<WallpaperCategory, WallpaperCollection[]>
);

export function getWallpaperCollections(category: WallpaperCategory): WallpaperCollection[] {
  return wallpaperCollections[category] || [];
}

export function getAllWallpaperCollections(): WallpaperCollectionEntry[] {
  return BRAND_CATEGORIES.flatMap((brand) =>
    getWallpaperCollections(brand.slug).map((collection) => ({
      category: brand.slug,
      collection,
    }))
  );
}

export function isWallpaperCategory(value: string): value is WallpaperCategory {
  return Object.prototype.hasOwnProperty.call(wallpaperCollections, value);
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

export function findWallpaperCollection(category: WallpaperCategory, slug: string): WallpaperCollection | null {
  return (
    getWallpaperCollections(category).find((collection) => slugifyWallpaperName(collection.name) === slug) || null
  );
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
