import googleAluminiumOsData from '@/data/desktopwalls/google-aluminium-os.json';
import googleChromeosData from '@/data/desktopwalls/google-chromeos.json';
import microsoftSurfaceData from '@/data/desktopwalls/microsoft-surface.json';
import microsoftWindowsData from '@/data/desktopwalls/microsoft-windows.json';
import ubuntuData from '@/data/desktopwalls/ubuntu.json';
import {
  slugifyWallpaperName,
  type WallpaperCollection,
  type WallpaperCollectionEntry,
} from '@/lib/wallpaper-data';
import { getDesktopTabData, type DesktopWallpaperCategory } from '@/lib/desktop-data';

export type { DesktopWallpaperCategory } from '@/lib/desktop-data';

// 纯工具与类目判断从 desktop-data 统一导出，避免仅需工具函数的模块加载全部 JSON。
export {
  getDesktopTabData,
  isDesktopWallpaperCategory,
  buildDesktopWallpaperDetailPath,
  getDesktopWallpaperCategoryLabel,
} from '@/lib/desktop-data';

// 以下全量数据访问供 desktop 首页聚合与 sitemap 使用。
const desktopDataSources: Record<string, WallpaperCollection[]> = {
  'google-aluminium-os': googleAluminiumOsData as WallpaperCollection[],
  'google-chromeos': googleChromeosData as WallpaperCollection[],
  'microsoft-surface': microsoftSurfaceData as WallpaperCollection[],
  'microsoft-windows': microsoftWindowsData as WallpaperCollection[],
  ubuntu: ubuntuData as WallpaperCollection[],
};

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

export function findDesktopWallpaperCollection(
  category: DesktopWallpaperCategory,
  slug: string
): WallpaperCollection | null {
  return (
    getDesktopWallpaperCollections(category).find((collection) => slugifyWallpaperName(collection.name) === slug) ||
    null
  );
}
