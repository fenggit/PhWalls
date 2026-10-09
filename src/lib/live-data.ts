import type { Language, TabInfo } from '@/types';
import { getDeviceBrandLabel } from '@/lib/device-brand-label';
import { slugifyWallpaperName } from '@/lib/wallpaper-data';

const liveBrands: Record<string, string> = {
  samsung: 'Samsung', xiaomi: 'Xiaomi', huawei: 'Huawei', oppo: 'OPPO', vivo: 'vivo',
  'google-pixel': 'Google Pixel', honor: 'Honor', oneplus: 'OnePlus', sony: 'Sony',
  realme: 'Realme', iqoo: 'iQOO', 'asus-rog-phone': 'ASUS', lg: 'LG', lenovo: 'Lenovo',
  meizu: 'Meizu', nubia: 'Nubia', redmagic: 'REDMAGIC', zte: 'ZTE',
};

export function getLiveTabData(language: Language = 'en'): TabInfo[] {
  return Object.entries(liveBrands).map(([type, title]) => ({
    type, title: type === 'asus-rog-phone' ? title : getDeviceBrandLabel(type, language, title), icon: '', items: [],
  }));
}

export function isLiveWallpaperCategory(category: string): boolean {
  return Object.prototype.hasOwnProperty.call(liveBrands, category);
}

export function buildLiveWallpaperDetailPath(category: string, name: string): string {
  return `/live/wallpapers/${category}/${slugifyWallpaperName(name)}`;
}
