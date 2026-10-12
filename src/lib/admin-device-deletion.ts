import { getWallpaperDb, isWallpaperDbEnabled, type DeviceRow, type WallpaperRow } from '@/lib/wallpaper-db';
import { deleteR2Object } from '@/lib/r2-upload';
import { hasStaticWallpaperReference } from '@/lib/admin-static-assets';
import { getI18nTexts } from '@/lib/i18n';

export type AdminDeviceDeletionPreview = {
  device: DeviceRow;
  wallpapers: WallpaperRow[];
  files: Array<{ key: string; shared: boolean }>;
  translation_count: number;
  snapshot: string;
  blocked_reason: string | null;
};

function deviceId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 80) throw new Error('设备 ID 无效');
  return value.trim();
}

function wallpaperKeys(row: WallpaperRow): string[] {
  const entries = [row.origin_key, row.compress_key,
    row.media_type === 'dynamic' ? row.origin_key.replace('/origin/', '/preview/') : null];
  return entries.filter((key): key is string => Boolean(key)).map((key) => {
    const parts = key.split('/');
    if (key.length > 500 || key.startsWith('/') || key.includes('\\') || key.includes('://') ||
      /[\u0000-\u001f\u007f]/.test(key) || parts.some((part) => !part || part === '.' || part === '..') ||
      !parts.slice(1, -1).some((part) => ['origin', 'compress', 'preview'].includes(part))) {
      throw new Error('已存文件路径无效，无法删除');
    }
    return key;
  });
}

async function snapshot(value: unknown): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Include derived video previews when checking ownership; paths are never accepted from the client.
const sharedFiles = `SELECT value AS key FROM json_each(?) files WHERE EXISTS (
  SELECT 1 FROM w_wallpapers w WHERE w.device_id != ? AND
    (w.origin_key = files.value OR w.compress_key = files.value OR
      (w.media_type = 'dynamic' AND REPLACE(w.origin_key, '/origin/', '/preview/') = files.value)))`;

export async function previewAdminDeviceDeletion(rawId: unknown): Promise<AdminDeviceDeletionPreview> {
  const id = deviceId(rawId);
  const db = getWallpaperDb();
  const device = await db.prepare('SELECT * FROM w_devices WHERE id = ?').bind(id).first<DeviceRow>();
  if (!device) throw new Error('设备不存在');
  // No pagination: confirmation must include drafts, unpublished items and pending deletions too.
  const { results: wallpapers } = await db.prepare('SELECT * FROM w_wallpapers WHERE device_id = ? ORDER BY media_type, name, id')
    .bind(id).all<WallpaperRow>();
  const keys = Array.from(new Set(wallpapers.flatMap(wallpaperKeys))).sort();
  const { results: shared } = await db.prepare(sharedFiles).bind(JSON.stringify(keys), id).all<{ key: string }>();
  const retained = new Set(shared.map((file) => file.key));
  const files = keys.map((key) => ({ key, shared: retained.has(key) }));
  const translations = await db.prepare('SELECT COUNT(*) AS count FROM w_collection_i18n WHERE device_id = ?')
    .bind(id).first<{ count: number }>();
  const translation_count = translations?.count || 0;
  const texts = getI18nTexts('zh');
  const blocked_reason = !isWallpaperDbEnabled() && await hasStaticWallpaperReference(files.filter((file) => !file.shared).map((file) => file.key))
    ? texts.adminDeviceDeleteJsonBlocked : null;
  return { device, wallpapers, files, translation_count, blocked_reason,
    snapshot: await snapshot({ device, wallpapers, files, translation_count, blocked_reason }) };
}

export async function deleteAdminDevice(input: Record<string, unknown>): Promise<{ id: string; deleted: true }> {
  const id = deviceId(input.id);
  const texts = getI18nTexts('zh');
  if (typeof input.snapshot !== 'string' || !/^[a-f0-9]{64}$/.test(input.snapshot)) throw new Error(texts.adminDeviceDeleteReviewRequired);
  const preview = await previewAdminDeviceDeletion(id);
  if (preview.snapshot !== input.snapshot) throw new Error(texts.adminDeviceDeleteChanged);
  if (preview.blocked_reason) throw new Error(preview.blocked_reason);
  const { device, wallpapers } = preview;
  const now = Date.now();
  if ((device.deletion_state === 'processing' && now - device.updated_date < 120000) ||
    wallpapers.some((row) => row.deletion_state === 'processing' && now - row.updated_date < 120000)) {
    throw new Error(texts.adminDeviceDeleteProcessing);
  }
  const keys = preview.files.filter((file) => !file.shared).map((file) => file.key);
  const db = getWallpaperDb();
  const version = Math.max(now, device.updated_date + 1, ...wallpapers.map((row) => row.updated_date + 1));
  // Compare every persisted wallpaper field inside the transaction, including inserts/removals.
  const columns: Array<keyof WallpaperRow> = ['id', 'device_id', 'name', 'mime_type', 'size_bytes', 'origin_key', 'compress_key',
    'width', 'height', 'file_format', 'theme', 'media_type', 'category', 'is_primary', 'tags', 'status', 'deletion_state', 'create_date', 'updated_date'];
  const matches = columns.map((column) => `json_extract(checked.value, '$.${column}') IS w.${column}`).join(' AND ');
  const deviceColumns: Array<keyof DeviceRow> = ['id', 'brand_logo', 'brand_name', 'device_name', 'name_key', 'device_slug',
    'device_category', 'is_popular_brand', 'device_splash_url', 'release_date', 'status', 'deletion_state', 'create_date', 'updated_date'];
  const deviceMatches = deviceColumns.map((column) => `json_extract(checked.value, '$.${column}') IS w_devices.${column}`).join(' AND ');
  const claimedDevice = `EXISTS (SELECT 1 FROM w_devices WHERE id = ? AND updated_date = ? AND deletion_state = 'processing')`;
  const claimed = await db.batch([
    db.prepare(`UPDATE w_devices SET status = 'unpublished', deletion_state = 'processing', updated_date = ?
      WHERE id = ? AND updated_date = ? AND deletion_state = ?
      AND EXISTS (SELECT 1 FROM json_each(?) checked WHERE ${deviceMatches})
      AND (SELECT COUNT(*) FROM w_collection_i18n WHERE device_id = ?) = ?
      AND (SELECT COUNT(*) FROM w_wallpapers WHERE device_id = ?) = ?
      AND NOT EXISTS (SELECT 1 FROM w_wallpapers w WHERE w.device_id = ?
        AND NOT EXISTS (SELECT 1 FROM json_each(?) checked WHERE ${matches}))
      AND NOT EXISTS (SELECT 1 FROM json_each(?) files JOIN w_wallpapers other
        ON other.origin_key = files.value OR other.compress_key = files.value OR
          (other.media_type = 'dynamic' AND REPLACE(other.origin_key, '/origin/', '/preview/') = files.value)
        JOIN w_devices owner ON owner.id = other.device_id
        WHERE owner.id != ? AND owner.deletion_state != 'none')
      AND NOT EXISTS (SELECT 1 FROM json_each(?) files WHERE json_extract(files.value, '$.shared') != EXISTS (
        SELECT 1 FROM w_wallpapers other WHERE other.device_id != ? AND
          (other.origin_key = json_extract(files.value, '$.key') OR other.compress_key = json_extract(files.value, '$.key') OR
            (other.media_type = 'dynamic' AND REPLACE(other.origin_key, '/origin/', '/preview/') = json_extract(files.value, '$.key')))))`)
      .bind(version, id, device.updated_date, device.deletion_state, JSON.stringify([device]), id, preview.translation_count,
        id, wallpapers.length, id, JSON.stringify(wallpapers), JSON.stringify(preview.files.map((file) => file.key)), id,
        JSON.stringify(preview.files), id),
    db.prepare(`UPDATE w_wallpapers SET status = 'unpublished', is_primary = 0, deletion_state = 'processing', updated_date = ?
      WHERE device_id = ? AND ${claimedDevice}`).bind(version, id, id, version),
    db.prepare(`INSERT INTO w_deleted_wallpaper_files (object_key, deleted_at)
      SELECT value, ? FROM json_each(?) WHERE ${claimedDevice} ON CONFLICT(object_key) DO NOTHING`)
      .bind(version, JSON.stringify(keys), id, version),
  ]);
  if (claimed[0].meta.changes !== 1) throw new Error(texts.adminDeviceDeleteChanged);
  try {
    // Bound concurrency for large devices, and finish all in-flight deletes before releasing the lease.
    let next = 0;
    const workers = await Promise.allSettled(Array.from({ length: Math.min(4, keys.length) }, async () => {
      while (next < keys.length) await deleteR2Object(keys[next++]);
    }));
    const failure = workers.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    const removed = await db.batch([
      db.prepare(`DELETE FROM w_wallpapers WHERE device_id = ? AND updated_date = ? AND deletion_state = 'processing'
        AND ${claimedDevice}`).bind(id, version, id, version),
      // Both static and live translations cascade from the device foreign key.
      db.prepare(`DELETE FROM w_devices WHERE id = ? AND updated_date = ? AND deletion_state = 'processing'
        AND NOT EXISTS (SELECT 1 FROM w_wallpapers WHERE device_id = ?)`)
        .bind(id, version, id),
    ]);
    if (removed[1].meta.changes !== 1) throw new Error(texts.adminDeviceDeleteChanged);
  } catch (error) {
    await db.batch([
      db.prepare("UPDATE w_wallpapers SET deletion_state = 'pending' WHERE device_id = ? AND updated_date = ? AND deletion_state = 'processing'")
        .bind(id, version),
      db.prepare("UPDATE w_devices SET deletion_state = 'pending' WHERE id = ? AND updated_date = ? AND deletion_state = 'processing'")
        .bind(id, version),
    ]);
    throw new Error(`${error instanceof Error ? error.message : 'R2 文件删除失败'}；${texts.adminDeviceDeleteRetryHint}`);
  }
  return { id, deleted: true };
}
