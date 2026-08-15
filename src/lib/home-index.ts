import homeIndex from '@/data/home-index.json';
import { BRAND_CATEGORIES } from '@/lib/brands';
import { sortByDateDesc } from '@/lib/data';
import type { WallpaperCollection, WallpaperCollectionEntry } from '@/lib/wallpaper-data';

// 首页轻量索引：每个集合仅含封面图（item[0]）与数量（count）。
// 由 scripts/generate-home-index.mjs 在构建前生成，避免首页 Edge Function
// 解析全部品牌 JSON（~2.2MB）导致冷启动超出 Cloudflare CPU 时间限制。
const HOME_COLLECTIONS = homeIndex as unknown as Record<string, WallpaperCollection[]>;
export const HOME_INITIAL_COLLECTION_LIMIT = 12;

// 供首页按分类渲染卡片（封面 + 数量）。
export function getHomeCollectionsByCategory(): Record<string, WallpaperCollection[]> {
  return HOME_COLLECTIONS;
}

// 供首页构建封面缩略图 URL 映射。
export function getAllHomeCollections(): WallpaperCollectionEntry[] {
  return BRAND_CATEGORIES.flatMap((brand) =>
    (HOME_COLLECTIONS[brand.slug] || []).map((collection) => ({
      category: brand.slug,
      collection,
    }))
  );
}

// The server only needs image URLs for the two initially rendered desktop rows.
export function getInitialHomeCollections(): WallpaperCollectionEntry[] {
  return BRAND_CATEGORIES.flatMap((brand) =>
    sortByDateDesc(HOME_COLLECTIONS[brand.slug] || [])
      .slice(0, HOME_INITIAL_COLLECTION_LIMIT)
      .map((collection) => ({
        category: brand.slug,
        collection,
      }))
  );
}
