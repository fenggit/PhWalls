import 'server-only';
import type { Language } from '@/types';
import { loadDbCollection, loadDbCollections, loadDbIndex, type WallpaperMediaType } from '@/lib/wallpaper-db';

export async function loadDesktopWallpaperCollections(category: string, language: Language = 'en') {
  return loadDbCollections(category, language);
}

export async function loadDesktopWallpaperCollectionIndex(category: string, language: Language = 'en') {
  return (await loadDbIndex([category], language))[category] || [];
}

export async function loadDesktopWallpaperCollection(category: string, slug: string, language: Language = 'en', media: WallpaperMediaType = 'static') {
  return loadDbCollection(category, slug, language, media);
}
