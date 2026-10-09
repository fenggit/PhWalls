import type { DeviceRow, WallpaperMediaType } from '@/lib/wallpaper-db';

export function deviceR2Prefix(device: Pick<DeviceRow, 'device_category' | 'brand_name' | 'device_slug'>, media: WallpaperMediaType = 'static'): string {
  if (media === 'dynamic') return `live/${device.brand_name}/${device.device_slug}`;
  return device.device_category === 'desktop'
    ? `desktopwalls/${device.brand_name}/${device.device_slug}`
    : `${device.brand_name}/${device.device_slug}`;
}

export function normalizeAdminR2Prefix(value: unknown): string {
  if (typeof value !== 'string') throw new Error('R2 存储目录无效');
  const prefix = value.trim().replace(/^\/+|\/+$/g, '');
  if (!prefix || prefix.length > 300 || prefix.includes('..') || /[\\:%?#\u0000-\u001f\u007f]/.test(prefix) ||
      prefix.split('/').some((part) => !part || part === '.' || /^(origin|compress)$/i.test(part))) {
    throw new Error('R2 目录须为相对路径，不能包含空层级、origin、compress、URL 或路径穿越');
  }
  return prefix;
}
