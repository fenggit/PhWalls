import 'server-only';
import type { Language } from '@/types';
import { loadDbCollection, loadDbCollections, isWallpaperDbEnabled } from '@/lib/wallpaper-db';
import { loadWallpaperCollection as loadJsonCollection, loadWallpaperCollections as loadJsonCollections } from '@/lib/wallpaper-data';

export async function loadWallpaperCollections(category: string, language: Language = 'en') {
  return isWallpaperDbEnabled() ? loadDbCollections(category, language) : loadJsonCollections(category);
}

export async function loadWallpaperCollection(category: string, slug: string, language: Language = 'en') {
  return isWallpaperDbEnabled() ? loadDbCollection(category, slug, language) : loadJsonCollection(category, slug);
}
