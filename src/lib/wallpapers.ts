import iPhoneData from '@/data/iPhone.json';
import iPadData from '@/data/iPad.json';
import macData from '@/data/Mac.json';
import iOSData from '@/data/iOS.json';
import iPadOSData from '@/data/iPadOS.json';
import macOSData from '@/data/macOS.json';
import newYearData from '@/data/New Year.json';
import wwdcData from '@/data/WWDC.json';
import {
  BRAND_CATEGORIES,
  type SourceWallpaperCategory,
  type WallpaperCategory,
} from '@/lib/brands';

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

const sourceCollections: Record<SourceWallpaperCategory, WallpaperCollection[]> = {
  iphone: iPhoneData as WallpaperCollection[],
  ipad: iPadData as WallpaperCollection[],
  mac: macData as WallpaperCollection[],
  ios: iOSData as WallpaperCollection[],
  ipados: iPadOSData as WallpaperCollection[],
  macos: macOSData as WallpaperCollection[],
  'new-year': newYearData as WallpaperCollection[],
  wwdc: wwdcData as WallpaperCollection[],
};

const wallpaperCollections: Record<WallpaperCategory, WallpaperCollection[]> = Object.fromEntries(
  BRAND_CATEGORIES.map((brand) => [brand.slug, sourceCollections[brand.source]])
) as Record<WallpaperCategory, WallpaperCollection[]>;

export function getWallpaperCollections(category: WallpaperCategory): WallpaperCollection[] {
  return wallpaperCollections[category];
}

export function getAllWallpaperCollections(): WallpaperCollectionEntry[] {
  return (Object.keys(wallpaperCollections) as WallpaperCategory[]).flatMap((category) =>
    wallpaperCollections[category].map((collection) => ({
      category,
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
    wallpaperCollections[category].find((collection) => slugifyWallpaperName(collection.name) === slug) || null
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
