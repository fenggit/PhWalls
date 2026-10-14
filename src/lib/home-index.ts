import type { Language } from '@/types';
import { BRAND_CATEGORIES } from '@/lib/brands';
import { sortByDateDesc } from '@/lib/data';
import { getWallpaperCollectionMedia } from '@/lib/wallpaper-media';
import type { WallpaperCollection, WallpaperCollectionEntry } from '@/lib/wallpaper-data';
import { loadDbIndex } from '@/lib/wallpaper-db';

// D1 首页轻量索引：每个集合仅含封面与数量。
export const HOME_INITIAL_COLLECTION_LIMIT = 12;

// 供首页按分类渲染卡片（封面 + 数量）。
export async function getHomeCollectionsByCategory(language: Language = 'en'): Promise<Record<string, WallpaperCollection[]>> {
  return loadDbIndex(BRAND_CATEGORIES.map((brand) => brand.slug), language);
}

// 静态详情页索引；动态详情由 sitemap 的 liveIndex 独立收录。
export async function getAllHomeCollections(): Promise<WallpaperCollectionEntry[]> {
  const collections = await getHomeCollectionsByCategory();
  return BRAND_CATEGORIES.flatMap((brand) =>
    (collections[brand.slug] || []).filter((collection) => getWallpaperCollectionMedia(collection) === 'static').map((collection) => ({
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
