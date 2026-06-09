import googleAluminiumOsData from '@/data/desktopwalls/google-aluminium-os.json';
import googleChromeosData from '@/data/desktopwalls/google-chromeos.json';
import microsoftSurfaceData from '@/data/desktopwalls/microsoft-surface.json';
import microsoftWindowsData from '@/data/desktopwalls/microsoft-windows.json';
import desktopTabData from '@/data/desktopwalls/tab.json';
import ubuntuData from '@/data/desktopwalls/ubuntu.json';
import type { TabInfo } from '@/types';
import { slugifyWallpaperName, type WallpaperCollection, type WallpaperCollectionEntry } from '@/lib/wallpapers';

export type DesktopWallpaperCategory = string;

const desktopDataSources: Record<string, WallpaperCollection[]> = {
  'google-aluminium-os': googleAluminiumOsData as WallpaperCollection[],
  'google-chromeos': googleChromeosData as WallpaperCollection[],
  'microsoft-surface': microsoftSurfaceData as WallpaperCollection[],
  'microsoft-windows': microsoftWindowsData as WallpaperCollection[],
  ubuntu: ubuntuData as WallpaperCollection[],
};

export function getDesktopTabData(): TabInfo[] {
  return (desktopTabData as Array<Partial<TabInfo> & Pick<TabInfo, 'title' | 'type'>>).map((tab) => ({
    icon: '',
    items: [],
    ...tab,
  }));
}

export function getDesktopWallpaperCollections(category: DesktopWallpaperCategory): WallpaperCollection[] {
  return desktopDataSources[category] || [];
}

export function getAllDesktopWallpaperCollections(): WallpaperCollectionEntry[] {
  return getDesktopTabData().flatMap((tab) =>
    getDesktopWallpaperCollections(tab.type).map((collection) => ({
      category: tab.type,
      collection,
    }))
  );
}

export function isDesktopWallpaperCategory(value: string): value is DesktopWallpaperCategory {
  return Object.prototype.hasOwnProperty.call(desktopDataSources, value);
}

export function buildDesktopWallpaperDetailPath(category: DesktopWallpaperCategory, name: string): string {
  return `/desktop/wallpapers/${category}/${slugifyWallpaperName(name)}`;
}

export function findDesktopWallpaperCollection(
  category: DesktopWallpaperCategory,
  slug: string
): WallpaperCollection | null {
  return (
    getDesktopWallpaperCollections(category).find((collection) => slugifyWallpaperName(collection.name) === slug) ||
    null
  );
}

export function getDesktopWallpaperCategoryLabel(category: DesktopWallpaperCategory): string {
  return getDesktopTabData().find((item) => item.type === category)?.title || category;
}
