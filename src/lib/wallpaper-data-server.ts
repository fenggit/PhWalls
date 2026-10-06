import 'server-only';
import type { Language } from '@/types';
import { loadDbCollection, loadDbCollections, loadDbIndex, isWallpaperDbEnabled } from '@/lib/wallpaper-db';
import { loadWallpaperCollection as loadJsonCollection, loadWallpaperCollections as loadJsonCollections } from '@/lib/wallpaper-data';

export async function loadWallpaperCollections(category: string, language: Language = 'en') {
  return isWallpaperDbEnabled() ? loadDbCollections(category, language) : loadJsonCollections(category);
}

// 分类卡片只需要封面与真实张数，避免读取整套壁纸明细。
export async function loadWallpaperCollectionIndex(category: string, language: Language = 'en') {
  if (isWallpaperDbEnabled()) {
    return (await loadDbIndex([category], language))[category] || [];
  }
  return (await loadJsonCollections(category)).map((collection) => ({
    ...collection,
    count: collection.item.length,
    item: collection.item.slice(0, 1),
  }));
}

export async function loadWallpaperCollection(category: string, slug: string, language: Language = 'en') {
  return isWallpaperDbEnabled() ? loadDbCollection(category, slug, language) : loadJsonCollection(category, slug);
}
