import 'server-only';
import type { Language } from '@/types';
import { loadDbCollection, loadDbCollections, isWallpaperDbEnabled } from '@/lib/wallpaper-db';
import { loadDesktopWallpaperCollection as loadJsonCollection,
  loadDesktopWallpaperCollections as loadJsonCollections } from '@/lib/desktop-data';

export async function loadDesktopWallpaperCollections(category: string, language: Language = 'en') {
  return isWallpaperDbEnabled() ? loadDbCollections(category, language) : loadJsonCollections(category);
}

export async function loadDesktopWallpaperCollection(category: string, slug: string, language: Language = 'en') {
  return isWallpaperDbEnabled() ? loadDbCollection(category, slug, language) : loadJsonCollection(category, slug);
}
