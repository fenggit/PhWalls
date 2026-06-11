import androidData from '@/data/android.json';
import googlePixelData from '@/data/google pixel.json';
import harmonyosData from '@/data/harmonyos.json';
import honorData from '@/data/honor.json';
import huaweiData from '@/data/huawei.json';
import huaweiMatepadData from '@/data/huawei matepad.json';
import motorolaData from '@/data/motorola.json';
import nokiaData from '@/data/nokia.json';
import nothingData from '@/data/nothing.json';
import oneplusData from '@/data/oneplus.json';
import oppoData from '@/data/oppo.json';
import realmeData from '@/data/realme.json';
import samsungData from '@/data/samsung.json';
import sonyData from '@/data/sony.json';
import transsionInfinixData from '@/data/transsion infinix.json';
import transsionTecnoData from '@/data/transsion tecno.json';
import vivoData from '@/data/vivo.json';
import xiaomiData from '@/data/xiaomi.json';
import { BRAND_CATEGORIES, type WallpaperCategory } from '@/lib/brands';
import {
  slugifyWallpaperName,
  type WallpaperCollection,
  type WallpaperCollectionEntry,
} from '@/lib/wallpaper-data';

export type { WallpaperCategory } from '@/lib/brands';
export type {
  WallpaperAsset,
  WallpaperCollection,
  WallpaperCollectionEntry,
} from '@/lib/wallpaper-data';

// 纯工具与类目判断从 wallpaper-data 统一导出，避免在仅需工具函数的
// 模块（如 seo.ts、品牌页）里被迫加载全部品牌 JSON。
export {
  slugifyWallpaperName,
  buildWallpaperDetailPath,
  parseWallpaperDate,
  getWallpaperCategoryLabel,
  isWallpaperCategory,
} from '@/lib/wallpaper-data';

// 以下全量数据访问供首页聚合、sitemap、公开 API 等确需全部数据的场景使用。
const dataSources: Record<string, WallpaperCollection[]> = {
  android: androidData as WallpaperCollection[],
  'google-pixel': googlePixelData as WallpaperCollection[],
  harmonyos: harmonyosData as WallpaperCollection[],
  honor: honorData as WallpaperCollection[],
  huawei: huaweiData as WallpaperCollection[],
  'huawei-matepad': huaweiMatepadData as WallpaperCollection[],
  motorola: motorolaData as WallpaperCollection[],
  nokia: nokiaData as WallpaperCollection[],
  nothing: nothingData as WallpaperCollection[],
  oneplus: oneplusData as WallpaperCollection[],
  oppo: oppoData as WallpaperCollection[],
  realme: realmeData as WallpaperCollection[],
  samsung: samsungData as WallpaperCollection[],
  sony: sonyData as WallpaperCollection[],
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

export function findWallpaperCollection(category: WallpaperCategory, slug: string): WallpaperCollection | null {
  return (
    getWallpaperCollections(category).find((collection) => slugifyWallpaperName(collection.name) === slug) || null
  );
}
