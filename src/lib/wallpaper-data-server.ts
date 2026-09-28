import 'server-only';
import { loadDbCollection, loadDbCollections, isWallpaperDbEnabled } from '@/lib/wallpaper-db';
import { loadWallpaperCollection as loadJsonCollection, loadWallpaperCollections as loadJsonCollections } from '@/lib/wallpaper-data';

export async function loadWallpaperCollections(category: string) {
  return isWallpaperDbEnabled() ? loadDbCollections(category) : loadJsonCollections(category);
}

export async function loadWallpaperCollection(category: string, slug: string) {
  return isWallpaperDbEnabled() ? loadDbCollection(category, slug) : loadJsonCollection(category, slug);
}
