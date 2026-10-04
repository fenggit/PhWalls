import type { Language } from '@/types';
import homeIndex from '@/data/home-index.json';
import { BRAND_CATEGORIES } from '@/lib/brands';
import { sortByDateDesc } from '@/lib/data';
import type { WallpaperCollection, WallpaperCollectionEntry } from '@/lib/wallpaper-data';
import { loadDbIndex, isWallpaperDbEnabled } from '@/lib/wallpaper-db';

// 首页轻量索引：每个集合仅含封面图（item[0]）与数量（count）。
// 由 scripts/generate-home-index.mjs 在构建前生成，避免首页 Edge Function
// 解析全部品牌 JSON（~2.2MB）导致冷启动超出 Cloudflare CPU 时间限制。
const HOME_COLLECTIONS = homeIndex as unknown as Record<string, WallpaperCollection[]>;
export const HOME_INITIAL_COLLECTION_LIMIT = 12;

// 供首页按分类渲染卡片（封面 + 数量）。
export async function getHomeCollectionsByCategory(language: Language = 'en'): Promise<Record<string, WallpaperCollection[]>> {
  return isWallpaperDbEnabled() ? loadDbIndex(BRAND_CATEGORIES.map((brand) => brand.slug), language) : HOME_COLLECTIONS;
}

// 供首页构建封面缩略图 URL 映射。
export async function getAllHomeCollections(): Promise<WallpaperCollectionEntry[]> {
  const collections = await getHomeCollectionsByCategory();
  return BRAND_CATEGORIES.flatMap((brand) =>
    (collections[brand.slug] || []).map((collection) => ({
      category: brand.slug,
      collection,
    }))
  );
}

// The server only needs image URLs for the two initially rendered desktop rows.
export async function getInitialHomeCollections(
  collectionLimit = HOME_INITIAL_COLLECTION_LIMIT
): Promise<WallpaperCollectionEntry[]> {
  const collections = await getHomeCollectionsByCategory();
  return BRAND_CATEGORIES.flatMap((brand) =>
    sortByDateDesc(collections[brand.slug] || [])
      .slice(0, collectionLimit)
      .map((collection) => ({
        category: brand.slug,
        collection,
      }))
  );
}
