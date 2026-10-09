import 'server-only';
import type { Language } from '@/types';
import { loadDbCollection, loadDbCollections, loadDbIndex, isWallpaperDbEnabled } from '@/lib/wallpaper-db';
import { loadWallpaperCollection as loadJsonCollection, loadWallpaperCollections as loadJsonCollections } from '@/lib/wallpaper-data';
import { loadLiveCollections } from '@/lib/live-data-server';
import { splitWallpaperCollection } from '@/lib/wallpaper-media';

export async function loadWallpaperCollections(category: string, language: Language = 'en') {
  return isWallpaperDbEnabled() ? loadDbCollections(category, language, 'static')
    : (await loadJsonCollections(category)).flatMap(splitWallpaperCollection).filter((collection) => collection.mediaType === 'static');
}

// 分类卡片只需要封面与真实张数，避免读取整套壁纸明细。
export async function loadWallpaperCollectionIndex(category: string, language: Language = 'en') {
  if (isWallpaperDbEnabled()) {
    return (await loadDbIndex([category], language))[category] || [];
  }
  const [staticCollections, liveCollections] = await Promise.all([
    loadJsonCollections(category), loadLiveCollections(category, language),
  ]);
  return [...staticCollections.flatMap(splitWallpaperCollection).filter((collection) => collection.mediaType === 'static'), ...liveCollections].map((collection) => ({
    ...collection,
    count: collection.item.length,
    item: collection.item.slice(0, 1),
  }));
}

export async function loadWallpaperCollection(category: string, slug: string, language: Language = 'en') {
  if (isWallpaperDbEnabled()) return loadDbCollection(category, slug, language, 'static');
  const collection = await loadJsonCollection(category, slug);
  return collection ? splitWallpaperCollection(collection).find((entry) => entry.mediaType === 'static') || null : null;
}
