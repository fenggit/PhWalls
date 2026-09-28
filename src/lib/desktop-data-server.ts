import 'server-only';
import { loadDbCollection, loadDbCollections, isWallpaperDbEnabled } from '@/lib/wallpaper-db';
import { loadDesktopWallpaperCollection as loadJsonCollection,
  loadDesktopWallpaperCollections as loadJsonCollections } from '@/lib/desktop-data';

export async function loadDesktopWallpaperCollections(category: string) {
  return isWallpaperDbEnabled() ? loadDbCollections(category) : loadJsonCollections(category);
}

export async function loadDesktopWallpaperCollection(category: string, slug: string) {
  return isWallpaperDbEnabled() ? loadDbCollection(category, slug) : loadJsonCollection(category, slug);
}
