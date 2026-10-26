import type { DeviceRow, WallpaperMediaType, WallpaperRow } from '@/lib/wallpaper-db';
import { getI18nTexts } from '@/lib/i18n';

export type AdminUploadDirectories = { prefix: string; directories: string[]; source: 'existing' | 'default' | 'multiple' | 'configured'; configured: boolean; historical_directories: string[] };
export type AdminUploadRole = 'origin' | 'compress' | 'preview';

export function getAdminUploadDirectories(
  device: Pick<DeviceRow, 'device_category' | 'brand_name' | 'device_name' | 'device_slug' | 'upload_prefix'>,
  _media: WallpaperMediaType,
  files: Pick<WallpaperRow, 'media_type' | 'origin_key'>[],
): AdminUploadDirectories {
  const historical = new Set<string>();
  const staticPaths = new Set<string>();
  for (const file of files) {
    const match = file.origin_key.match(/^(.+)\/origin\/[^/]+$/);
    if (!match) continue;
    try {
      const path = normalizeAdminR2Prefix(match[1]); historical.add(path);
      if (file.media_type === 'static' && !/^live\//i.test(path)) staticPaths.add(path);
    } catch { /* Invalid legacy keys are never upload targets. */ }
  }
  const paths = Array.from(staticPaths).sort();
  const common = { configured: Boolean(device.upload_prefix), historical_directories: Array.from(historical).sort() };
  if (device.upload_prefix) return { ...common, prefix: normalizeAdminR2Prefix(device.upload_prefix), directories: paths, source: 'configured' };
  if (paths.length) return { ...common, prefix: paths.length === 1 ? paths[0] : '', directories: paths, source: paths.length === 1 ? 'existing' : 'multiple' };
  let folderName = device.device_slug;
  try { if (!device.device_name.includes('/')) folderName = normalizeAdminR2Prefix(device.device_name); } catch { /* Use safe slug. */ }
  return { ...common, prefix: deviceR2Prefix({ ...device, device_slug: folderName }), directories: [], source: 'default' };
}

export function normalizeAdminUploadFileName(value: unknown, mime: string): string {
  const extensions: Record<string, string[]> = {
    'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'],
    'image/avif': ['avif'], 'image/gif': ['gif'], 'video/mp4': ['mp4'],
  };
  if (typeof value !== 'string' || !value || value.length > 255 || value.includes('..') ||
      /[\\/:%?#\u0000-\u001f\u007f]/.test(value) ||
      !/^.+\.[^.]+$/.test(value) || !extensions[mime]?.includes(value.split('.').pop()!.toLowerCase())) {
    throw new Error(getI18nTexts('zh').adminUploadFileNameInvalid);
  }
  return value;
}

export function assertAdminUploadMime(mime: string, role: AdminUploadRole, media: WallpaperMediaType): void {
  const image = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'].includes(mime);
  const video = mime === 'video/mp4';
  if (role === 'preview' ? media !== 'dynamic' || !video : role === 'compress' ? !image : media === 'dynamic' ? !video : !image) {
    throw new Error('文件类型与所选壁纸类型不匹配：动态原文件须为 MP4，静态原文件与封面须为图片');
  }
}

// Media is accepted for caller compatibility; new storage is always device-wide.
export function deviceR2Prefix(device: Pick<DeviceRow, 'device_category' | 'brand_name' | 'device_slug'>): string {
  return device.device_category === 'desktop'
    ? `desktopwalls/${device.brand_name}/${device.device_slug}`
    : `${device.brand_name}/${device.device_slug}`;
}

export function normalizeAdminR2Prefix(value: unknown): string {
  if (typeof value !== 'string') throw new Error('R2 存储目录无效');
  const prefix = value.trim().replace(/^\/+|\/+$/g, '');
  if (!prefix || prefix.length > 300 || prefix.includes('..') || /[\\:%?#\u0000-\u001f\u007f]/.test(prefix) ||
      prefix.split('/').some((part) => !part || part === '.' || /^(origin|compress|preview)$/i.test(part))) {
    throw new Error('R2 目录须为相对路径，不能包含空层级、origin、compress、URL 或路径穿越');
  }
  return prefix;
}
