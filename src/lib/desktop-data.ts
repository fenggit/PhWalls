import desktopTabData from '@/data/desktopwalls/tab.json';
import type { TabInfo } from '@/types';
import { slugifyWallpaperName } from '@/lib/wallpaper-data';
import type { WallpaperMediaType } from '@/lib/wallpaper-db';

export type DesktopWallpaperCategory = string;

export function getDesktopTabData(): TabInfo[] {
  return (desktopTabData as Array<Partial<TabInfo> & Pick<TabInfo, 'title' | 'type'>>).map((tab) => ({
    icon: '',
    items: [],
    ...tab,
  }));
}

export function isDesktopWallpaperCategory(value: string): value is DesktopWallpaperCategory {
  return getDesktopTabData().some((tab) => tab.type === value && !tab.link);
}

export function buildDesktopWallpaperDetailPath(category: DesktopWallpaperCategory, name: string, media: WallpaperMediaType = 'static'): string {
  return `/desktop/${media === 'dynamic' ? 'live-wallpapers' : 'wallpapers'}/${category}/${slugifyWallpaperName(name)}`;
}

export function getDesktopWallpaperCategoryLabel(category: DesktopWallpaperCategory): string {
  return getDesktopTabData().find((item) => item.type === category)?.title || category;
}
