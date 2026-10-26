import desktopTabData from '@/data/desktopwalls/tab.json';
import type { Language, TabInfo } from '@/types';
import { getI18nTexts } from '@/lib/i18n';
import { slugifyWallpaperName } from '@/lib/wallpaper-data';
import type { WallpaperMediaType } from '@/lib/wallpaper-db';

export type DesktopWallpaperCategory = string;

export function getDesktopTabData(language: Language = 'en'): TabInfo[] {
  return (desktopTabData as Array<Partial<TabInfo> & Pick<TabInfo, 'title' | 'type'>>).map((tab) => ({
    icon: '',
    items: [],
    ...tab,
    title: tab.type === 'microsoft-design' ? getI18nTexts(language).microsoftDesignCategoryLabel : tab.title,
  }));
}

export function isDesktopWallpaperCategory(value: string): value is DesktopWallpaperCategory {
  return getDesktopTabData().some((tab) => tab.type === value && !tab.link);
}

export function buildDesktopWallpaperDetailPath(category: DesktopWallpaperCategory, name: string, media: WallpaperMediaType = 'static'): string {
  return `/desktop/${media === 'dynamic' ? 'live-wallpapers' : 'wallpapers'}/${category}/${slugifyWallpaperName(name)}`;
}

export function getDesktopWallpaperCategoryLabel(category: DesktopWallpaperCategory, language: Language = 'en'): string {
  return getDesktopTabData(language).find((item) => item.type === category)?.title || category;
}
