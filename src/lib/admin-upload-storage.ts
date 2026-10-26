import { getWallpaperDb, type DeviceRow, type WallpaperMediaType, type WallpaperRow } from '@/lib/wallpaper-db';
import { assertAdminUploadPrefixNamespace, getAdminUploadDirectories, normalizeAdminR2Prefix } from '@/lib/admin-upload-path';

export async function assertAdminUploadPrefixOwnership(deviceId: string, prefix: string) {
  const conflict = await getWallpaperDb().prepare(`SELECT id FROM w_devices WHERE id != ? AND upload_prefix = ?
    UNION ALL SELECT device_id AS id FROM w_wallpapers WHERE device_id != ? AND
    (substr(origin_key, 1, length(?) + 1) = ? || '/' OR substr(compress_key, 1, length(?) + 1) = ? || '/') LIMIT 1`)
    .bind(deviceId, prefix, deviceId, prefix, prefix, prefix, prefix).first();
  if (conflict) throw new Error('上传目录已属于其他设备，请选择其他目录');
}
export async function getAdminUploadStorage(device: DeviceRow, media: WallpaperMediaType = 'static') {
  const { results } = await getWallpaperDb().prepare(
    "SELECT media_type, origin_key FROM w_wallpapers WHERE device_id = ? AND deletion_state = 'none'"
  ).bind(device.id).all<Pick<WallpaperRow, 'media_type' | 'origin_key'>>();
  const storage = getAdminUploadDirectories(device, media, results);
  return { ...storage, otherDirectories: [], liveBrandDirectory: device.brand_name };
}
export async function resolveAdminUploadStorage(device: DeviceRow, media: WallpaperMediaType, input: Record<string, unknown>) {
  const storage = await getAdminUploadStorage(device, media);
  const target = input.r2_prefix === undefined ? storage.prefix : normalizeAdminR2Prefix(input.r2_prefix);
  if (!target) throw new Error('该设备存在多个历史目录，请先设置统一上传目录');
  assertAdminUploadPrefixNamespace(device, target);
  if (input.path_mode !== undefined && input.path_mode !== 'device' && input.path_mode !== 'custom') throw new Error('目录方式无效');
  if (device.upload_prefix && target !== device.upload_prefix) throw new Error('设备目录已变化，请重新选择上传目标');
  if (/^live\//i.test(target)) throw new Error('新上传目录不能使用历史 live/ 命名空间');
  await assertAdminUploadPrefixOwnership(device.id, target);
  if (!device.upload_prefix) {
    const result = await getWallpaperDb().prepare(`UPDATE w_devices SET upload_prefix = ?, updated_date = ? WHERE id = ?
      AND upload_prefix IS NULL AND updated_date = ? AND deletion_state = 'none'
      AND NOT EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id = ? AND media_type = ?)`)
      .bind(target, Math.max(Date.now(), device.updated_date + 1), device.id, device.updated_date, device.id, media).run();
    if (result.meta.changes !== 1) {
      const current = await getWallpaperDb().prepare('SELECT upload_prefix FROM w_devices WHERE id = ?').bind(device.id).first<DeviceRow>();
      if (current?.upload_prefix !== target) throw new Error('设备目录已变化，请重新选择上传目标');
    }
  }
  return target;
}
