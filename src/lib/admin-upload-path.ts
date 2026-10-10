import type { DeviceRow, WallpaperMediaType, WallpaperRow } from '@/lib/wallpaper-db';

export type AdminUploadDirectories = { prefix: string; directories: string[]; source: 'existing' | 'default' | 'multiple' };

export function getAdminUploadDirectories(
  device: Pick<DeviceRow, 'device_category' | 'brand_name' | 'device_name' | 'device_slug'>,
  media: WallpaperMediaType,
  files: Pick<WallpaperRow, 'media_type' | 'origin_key'>[],
): AdminUploadDirectories {
  const directories = new Set<string>();
  for (const file of files) {
    if (file.media_type !== media) continue;
    const match = file.origin_key.match(/^(.+)\/origin\/[^/]+$/);
    if (!match) continue;
    try { directories.add(normalizeAdminR2Prefix(match[1])); }
    catch { /* 旧数据中的无效路径不能用作上传目录。 */ }
  }
  const paths = Array.from(directories).sort();
  if (!paths.length) {
    let folderName = device.device_slug;
    try {
      // 设备名称作为单层目录保留大小写和空格；不适合作目录的名称回退到 slug。
      if (!device.device_name.includes('/')) folderName = normalizeAdminR2Prefix(device.device_name);
    } catch { /* 设备名称中的路径保留字符不能用于新目录。 */ }
    return { prefix: deviceR2Prefix({ ...device, device_slug: folderName }, media), directories: [], source: 'default' };
  }
  return { prefix: paths.length === 1 ? paths[0] : '', directories: paths, source: paths.length === 1 ? 'existing' : 'multiple' };
}

export function assertAdminUploadMime(mime: string, role: 'origin' | 'compress', media: WallpaperMediaType): void {
  const image = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(mime);
  const video = ['video/mp4', 'video/webm'].includes(mime);
  if (role === 'compress' ? !image : media === 'dynamic' ? !video : !image) {
    throw new Error('文件类型与所选壁纸类型不匹配：动态原文件须为 MP4/WebM，静态原文件与封面须为图片');
  }
}

// 保留基于 slug 的旧授权路径；新上传目录由 getAdminUploadDirectories 按设备名称生成。
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
