import { loadWallpaperCollections, WALLPAPER_BRAND_SLUGS } from '@/lib/wallpaper-data';
import { getDesktopTabData, isDesktopWallpaperCategory, loadDesktopWallpaperCollections } from '@/lib/desktop-data';

let references: Promise<Set<string>> | null = null;

export async function hasStaticWallpaperReference(keys: string[]): Promise<boolean> {
  if (!references) {
    references = Promise.all([
      ...WALLPAPER_BRAND_SLUGS.map(loadWallpaperCollections),
      ...getDesktopTabData().filter((tab) => isDesktopWallpaperCategory(tab.type))
        .map((tab) => loadDesktopWallpaperCollections(tab.type)),
    ]).then((brands) => {
      const result = new Set<string>();
      for (const collections of brands) for (const collection of collections) for (const wallpaper of collection.item) {
        if (wallpaper.originPath) result.add(wallpaper.originPath);
        if (wallpaper.compressPath) result.add(wallpaper.compressPath);
      }
      return result;
    }).catch((error) => { references = null; throw error; });
  }
  const assets = await references;
  return keys.some((key) => assets.has(key));
}
