import desktopTabData from '@/data/desktopwalls/tab.json';
import type { TabInfo } from '@/types';
import { slugifyWallpaperName, type WallpaperCollection } from '@/lib/wallpaper-data';

export type DesktopWallpaperCategory = string;

// 按品牌的惰性数据加载器：不静态 import 任何 desktop JSON，
// 详情页等 Edge Function 只解析所需的单个品牌数据。
const desktopBrandLoaders: Record<string, () => Promise<WallpaperCollection[]>> = {
  'google-aluminium-os': () =>
    import('@/data/desktopwalls/google-aluminium-os.json').then((m) => m.default as WallpaperCollection[]),
  'google-chromeos': () =>
    import('@/data/desktopwalls/google-chromeos.json').then((m) => m.default as WallpaperCollection[]),
  'microsoft-surface': () =>
    import('@/data/desktopwalls/microsoft-surface.json').then((m) => m.default as WallpaperCollection[]),
  'microsoft-windows': () =>
    import('@/data/desktopwalls/microsoft-windows.json').then((m) => m.default as WallpaperCollection[]),
  ubuntu: () => import('@/data/desktopwalls/ubuntu.json').then((m) => m.default as WallpaperCollection[]),
};

export function getDesktopTabData(): TabInfo[] {
  return (desktopTabData as Array<Partial<TabInfo> & Pick<TabInfo, 'title' | 'type'>>).map((tab) => ({
    icon: '',
    items: [],
    ...tab,
  }));
}

export function isDesktopWallpaperCategory(value: string): value is DesktopWallpaperCategory {
  return Object.prototype.hasOwnProperty.call(desktopBrandLoaders, value);
}

export function buildDesktopWallpaperDetailPath(category: DesktopWallpaperCategory, name: string): string {
  return `/desktop/wallpapers/${category}/${slugifyWallpaperName(name)}`;
}

export function getDesktopWallpaperCategoryLabel(category: DesktopWallpaperCategory): string {
  return getDesktopTabData().find((item) => item.type === category)?.title || category;
}

// 惰性加载单个 desktop 品牌的壁纸集合。
export async function loadDesktopWallpaperCollections(
  category: string
): Promise<WallpaperCollection[]> {
  const loader = desktopBrandLoaders[category];
  if (!loader) {
    return [];
  }
  return loader();
}

// 惰性查找单个 desktop 品牌下的某个壁纸集合。
export async function loadDesktopWallpaperCollection(
  category: string,
  slug: string
): Promise<WallpaperCollection | null> {
  const collections = await loadDesktopWallpaperCollections(category);
  return collections.find((collection) => slugifyWallpaperName(collection.name) === slug) || null;
}
