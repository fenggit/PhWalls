import type { Language } from '@/types';
import homeIndex from '@/data/home-index.json';
import { BRAND_CATEGORIES } from '@/lib/brands';
import { sortByDateDesc } from '@/lib/data';
import { getWallpaperCollectionMedia } from '@/lib/wallpaper-media';
import type { WallpaperCollection, WallpaperCollectionEntry } from '@/lib/wallpaper-data';
import { loadDbIndex, isWallpaperDbEnabled } from '@/lib/wallpaper-db';
import { loadLiveIndex } from '@/lib/live-data-server';

// 首页轻量索引：每个集合仅含封面图（item[0]）与数量（count）。
// 由 scripts/generate-home-index.mjs 在构建前生成，避免首页 Edge Function
// 解析全部品牌 JSON（~2.2MB）导致冷启动超出 Cloudflare CPU 时间限制。
const HOME_COLLECTIONS = homeIndex as unknown as Record<string, WallpaperCollection[]>;
export const HOME_INITIAL_COLLECTION_LIMIT = 12;

// 供首页按分类渲染卡片（封面 + 数量）。
export async function getHomeCollectionsByCategory(language: Language = 'en'): Promise<Record<string, WallpaperCollection[]>> {
  if (isWallpaperDbEnabled()) return loadDbIndex(BRAND_CATEGORIES.map((brand) => brand.slug), language);
  const liveCollections = await loadLiveIndex(language);
  return Object.fromEntries(BRAND_CATEGORIES.map(({ slug }) => [slug,
    [...(HOME_COLLECTIONS[slug] || []).filter((collection) => getWallpaperCollectionMedia(collection) === 'static'), ...(liveCollections[slug] || [])],
  ]));
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
