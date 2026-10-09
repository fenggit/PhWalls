import 'server-only';
import type { Language } from '@/types';
import { loadDbCollection, loadDbCollections, loadDbIndex, isWallpaperDbEnabled, type WallpaperMediaType } from '@/lib/wallpaper-db';
import { loadDesktopWallpaperCollections as loadJsonCollections } from '@/lib/desktop-data';
import { getWallpaperCollectionMedia, splitWallpaperCollection } from '@/lib/wallpaper-media';
import { slugifyWallpaperName } from '@/lib/wallpaper-data';

export async function loadDesktopWallpaperCollections(category: string, language: Language = 'en') {
  return isWallpaperDbEnabled() ? loadDbCollections(category, language)
    : (await loadJsonCollections(category)).flatMap(splitWallpaperCollection);
}

export async function loadDesktopWallpaperCollectionIndex(category: string, language: Language = 'en') {
  if (isWallpaperDbEnabled()) return (await loadDbIndex([category], language))[category] || [];
  return (await loadDesktopWallpaperCollections(category, language)).map((collection) => ({
    ...collection, count: collection.item.length, item: collection.item.slice(0, 1),
  }));
}

export async function loadDesktopWallpaperCollection(category: string, slug: string, language: Language = 'en', media: WallpaperMediaType = 'static') {
  if (isWallpaperDbEnabled()) return loadDbCollection(category, slug, language, media);
  const collections = (await loadJsonCollections(category)).flatMap(splitWallpaperCollection);
  return collections.find((collection) => getWallpaperCollectionMedia(collection) === media
    && (collection.slug || slugifyWallpaperName(collection.name)) === slug) || null;
}
