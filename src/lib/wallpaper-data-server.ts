import 'server-only';
import type { Language } from '@/types';
import { loadDbCollection, loadDbCollections, loadDbIndex } from '@/lib/wallpaper-db';

export async function loadWallpaperCollections(category: string, language: Language = 'en') {
  return loadDbCollections(category, language, 'static');
}

export async function loadWallpaperCollectionIndex(category: string, language: Language = 'en') {
  return (await loadDbIndex([category], language))[category] || [];
}

export async function loadWallpaperCollection(category: string, slug: string, language: Language = 'en') {
  return loadDbCollection(category, slug, language, 'static');
}
