import { getWallpaperDb, type DeviceRow, type WallpaperRow, type WallpaperMediaType, type DeviceI18nRow } from '@/lib/wallpaper-db';
import { deleteR2Object } from '@/lib/r2-upload';
import { getI18nTexts } from '@/lib/i18n';

export type AdminDeviceDeletionPreview = {
  device: DeviceRow;
  media_type: WallpaperMediaType | null;
  collection_deletion: CollectionDeletion | null;
  wallpapers: WallpaperRow[];
  files: Array<{ key: string; shared: boolean }>;
  translations: DeviceI18nRow[];
  translation_count: number;
  snapshot: string;
  blocked_reason: string | null;
};

type CollectionDeletion = { device_id: string; media_type: WallpaperMediaType; deletion_state: 'processing' | 'pending'; updated_date: number; lease_token: string };

function deletionMedia(value: unknown): WallpaperMediaType | null {
  if (value === undefined || value === null) return null;
  if (value !== 'static' && value !== 'dynamic') throw new Error('媒体类型无效');
  return value;
}

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
  SELECT 1 FROM w_wallpapers w WHERE NOT (w.device_id = ? AND (? IS NULL OR w.media_type = ?)) AND
    (w.origin_key = files.value OR w.compress_key = files.value OR
      (w.media_type = 'dynamic' AND REPLACE(w.origin_key, '/origin/', '/preview/') = files.value)))`;

export async function previewAdminDeviceDeletion(rawId: unknown, rawMedia?: unknown): Promise<AdminDeviceDeletionPreview> {
  const id = deviceId(rawId);
  const media = deletionMedia(rawMedia);
  const db = getWallpaperDb();
  const device = await db.prepare('SELECT * FROM w_devices WHERE id = ?').bind(id).first<DeviceRow>();
  if (!device) throw new Error('设备不存在');
  const collection_deletion = media ? await db.prepare('SELECT * FROM w_collection_deletions WHERE device_id = ? AND media_type = ?')
    .bind(id, media).first<CollectionDeletion>() : null;
  // No pagination: confirmation must include drafts, unpublished items and pending deletions too.
  const { results: wallpapers } = await db.prepare('SELECT * FROM w_wallpapers WHERE device_id = ? AND (? IS NULL OR media_type = ?) ORDER BY media_type, name, id')
    .bind(id, media, media).all<WallpaperRow>();
  const keys = Array.from(new Set(wallpapers.flatMap(wallpaperKeys))).sort();
  const { results: shared } = await db.prepare(sharedFiles).bind(JSON.stringify(keys), id, media, media).all<{ key: string }>();
  const retained = new Set(shared.map((file) => file.key));
  const files = keys.map((key) => ({ key, shared: retained.has(key) }));
  const { results: translations } = await db.prepare('SELECT * FROM w_collection_i18n WHERE device_id = ? AND (? IS NULL OR media_type = ?) ORDER BY media_type, language, id')
    .bind(id, media, media).all<DeviceI18nRow>();
  const translation_count = translations.length;
  const blocked_reason = null;
  return { device, media_type: media, collection_deletion, wallpapers, files, translations, translation_count, blocked_reason,
    snapshot: await snapshot({ device, media_type: media, collection_deletion, wallpapers, files, translations, translation_count, blocked_reason }) };
}

export type AdminDeviceDeletionResult = { id: string; deleted: true; device_deleted: boolean };

export async function deleteAdminDevice(input: Record<string, unknown>): Promise<AdminDeviceDeletionResult> {
  const id = deviceId(input.id);
  const texts = getI18nTexts('zh');
  if (typeof input.snapshot !== 'string' || !/^[a-f0-9]{64}$/.test(input.snapshot)) throw new Error(texts.adminDeviceDeleteReviewRequired);
  const media = deletionMedia(input.media_type);
  const preview = await previewAdminDeviceDeletion(id, media);
  if (preview.snapshot !== input.snapshot) throw new Error(texts.adminDeviceDeleteChanged);
  if (preview.blocked_reason) throw new Error(preview.blocked_reason);
  if (media) return deleteAdminCollection(preview);
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
  const translationColumns: Array<keyof DeviceI18nRow> = ['id', 'device_id', 'media_type', 'language', 'display_name', 'seo_title', 'description', 'create_date', 'updated_date'];
  const translationMatches = translationColumns.map((column) => `json_extract(checked.value, '$.${column}') IS t.${column}`).join(' AND ');
  const deviceMatches = deviceColumns.map((column) => `json_extract(checked.value, '$.${column}') IS w_devices.${column}`).join(' AND ');
  const claimedDevice = `EXISTS (SELECT 1 FROM w_devices WHERE id = ? AND updated_date = ? AND deletion_state = 'processing')`;
  const claimed = await db.batch([
    db.prepare(`UPDATE w_devices SET status = 'unpublished', deletion_state = 'processing', updated_date = ?
      WHERE id = ? AND updated_date = ? AND deletion_state = ?
      AND NOT EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id = w_devices.id)
      AND EXISTS (SELECT 1 FROM json_each(?) checked WHERE ${deviceMatches})
      AND (SELECT COUNT(*) FROM w_collection_i18n WHERE device_id = ?) = ?
      AND NOT EXISTS (SELECT 1 FROM w_collection_i18n t WHERE t.device_id = ?
        AND NOT EXISTS (SELECT 1 FROM json_each(?) checked WHERE ${translationMatches}))
      AND (SELECT COUNT(*) FROM w_wallpapers WHERE device_id = ?) = ?
      AND NOT EXISTS (SELECT 1 FROM w_wallpapers w WHERE w.device_id = ?
        AND NOT EXISTS (SELECT 1 FROM json_each(?) checked WHERE ${matches}))
      AND NOT EXISTS (SELECT 1 FROM json_each(?) files JOIN w_wallpapers other
        ON other.origin_key = files.value OR other.compress_key = files.value OR
          (other.media_type = 'dynamic' AND REPLACE(other.origin_key, '/origin/', '/preview/') = files.value)
        JOIN w_devices owner ON owner.id = other.device_id
        WHERE owner.id != ? AND (owner.deletion_state != 'none' OR other.deletion_state != 'none'))
      AND NOT EXISTS (SELECT 1 FROM json_each(?) files WHERE json_extract(files.value, '$.shared') != EXISTS (
        SELECT 1 FROM w_wallpapers other WHERE other.device_id != ? AND
          (other.origin_key = json_extract(files.value, '$.key') OR other.compress_key = json_extract(files.value, '$.key') OR
            (other.media_type = 'dynamic' AND REPLACE(other.origin_key, '/origin/', '/preview/') = json_extract(files.value, '$.key')))))`)
      .bind(version, id, device.updated_date, device.deletion_state, JSON.stringify([device]), id, preview.translation_count, id, JSON.stringify(preview.translations),
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
  return { id, deleted: true, device_deleted: true };
}

async function deleteAdminCollection(preview: AdminDeviceDeletionPreview): Promise<AdminDeviceDeletionResult> {
  const { device, wallpapers, media_type: media, collection_deletion: lock } = preview;
  const id = device.id;
  const texts = getI18nTexts('zh');
  if (device.deletion_state !== 'none') throw new Error(texts.adminDeviceDeleteProcessing);
  if (!wallpapers.length) throw new Error(texts.adminDeviceDeleteChanged);
  const now = Date.now();
  if ((lock?.deletion_state === 'processing' && now - lock.updated_date < 120000) ||
    wallpapers.some((row) => row.deletion_state === 'processing' && now - row.updated_date < 120000)) {
    throw new Error(texts.adminDeviceDeleteProcessing);
  }
  const db = getWallpaperDb();
  const leaseToken = crypto.randomUUID();
  const version = Math.max(now, (lock?.updated_date || 0) + 1, ...wallpapers.map((row) => row.updated_date + 1));
  const keys = preview.files.filter((file) => !file.shared).map((file) => file.key);
  const columns: Array<keyof WallpaperRow> = ['id', 'device_id', 'name', 'mime_type', 'size_bytes', 'origin_key', 'compress_key',
    'width', 'height', 'file_format', 'theme', 'media_type', 'category', 'is_primary', 'tags', 'status', 'deletion_state', 'create_date', 'updated_date'];
  const matches = columns.map((column) => `json_extract(checked.value, '$.${column}') IS w.${column}`).join(' AND ');
  const deviceColumns: Array<keyof DeviceRow> = ['id', 'brand_logo', 'brand_name', 'device_name', 'name_key', 'device_slug',
    'device_category', 'is_popular_brand', 'device_splash_url', 'release_date', 'status', 'deletion_state', 'create_date', 'updated_date'];
  const translationColumns: Array<keyof DeviceI18nRow> = ['id', 'device_id', 'media_type', 'language', 'display_name', 'seo_title', 'description', 'create_date', 'updated_date'];
  const translationMatches = translationColumns.map((column) => `json_extract(checked.value, '$.${column}') IS t.${column}`).join(' AND ');
  const deviceMatches = deviceColumns
    .map((column) => `json_extract(checked.value, '$.${column}') IS d.${column}`).join(' AND ');
  const owned = `EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id = ? AND media_type = ?
    AND updated_date = ? AND lease_token = ? AND deletion_state = 'processing')`;
  // Claim exactly the reviewed collection. Same-device files used by the other media are shared too.
  const claimed = await db.batch([
    db.prepare(`INSERT INTO w_collection_deletions (device_id, media_type, deletion_state, updated_date, lease_token)
      SELECT ?, ?, 'processing', ?, ? WHERE
      EXISTS (SELECT 1 FROM w_devices d, json_each(?) checked WHERE d.id = ? AND d.deletion_state = 'none' AND ${deviceMatches})
      AND (SELECT COUNT(*) FROM w_collection_deletions WHERE device_id = ? AND media_type = ?) = ?
      AND NOT EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id = ? AND media_type = ? AND
        (updated_date != ? OR deletion_state != ?))
      AND (SELECT COUNT(*) FROM w_collection_i18n WHERE device_id = ? AND media_type = ?) = ?
      AND NOT EXISTS (SELECT 1 FROM w_collection_i18n t WHERE t.device_id = ? AND t.media_type = ?
        AND NOT EXISTS (SELECT 1 FROM json_each(?) checked WHERE ${translationMatches}))
      AND (SELECT COUNT(*) FROM w_wallpapers WHERE device_id = ? AND media_type = ?) = ?
      AND NOT EXISTS (SELECT 1 FROM w_wallpapers w WHERE w.device_id = ? AND w.media_type = ?
        AND NOT EXISTS (SELECT 1 FROM json_each(?) checked WHERE ${matches}))
      AND NOT EXISTS (SELECT 1 FROM json_each(?) files JOIN w_wallpapers other ON
        other.origin_key = files.value OR other.compress_key = files.value OR
        (other.media_type = 'dynamic' AND REPLACE(other.origin_key, '/origin/', '/preview/') = files.value)
        JOIN w_devices owner ON owner.id = other.device_id
        WHERE NOT (other.device_id = ? AND other.media_type = ?) AND
          (owner.deletion_state != 'none' OR other.deletion_state != 'none' OR EXISTS
            (SELECT 1 FROM w_collection_deletions WHERE device_id = other.device_id AND media_type = other.media_type)))
      AND NOT EXISTS (SELECT 1 FROM json_each(?) files WHERE json_extract(files.value, '$.shared') != EXISTS (
        SELECT 1 FROM w_wallpapers other WHERE NOT (other.device_id = ? AND other.media_type = ?) AND
          (other.origin_key = json_extract(files.value, '$.key') OR other.compress_key = json_extract(files.value, '$.key') OR
          (other.media_type = 'dynamic' AND REPLACE(other.origin_key, '/origin/', '/preview/') = json_extract(files.value, '$.key')))))
      ON CONFLICT(device_id, media_type) DO UPDATE SET deletion_state = 'processing', updated_date = excluded.updated_date, lease_token = excluded.lease_token`)
      .bind(id, media, version, leaseToken, JSON.stringify([device]), id, id, media, lock ? 1 : 0,
        id, media, lock?.updated_date || 0, lock?.deletion_state || 'pending', id, media, preview.translation_count, id, media, JSON.stringify(preview.translations),
        id, media, wallpapers.length, id, media, JSON.stringify(wallpapers), JSON.stringify(preview.files.map((file) => file.key)),
        id, media, JSON.stringify(preview.files), id, media),
    db.prepare(`UPDATE w_wallpapers SET status = 'unpublished', is_primary = 0, deletion_state = 'processing', updated_date = ?
      WHERE device_id = ? AND media_type = ? AND ${owned}`).bind(version, id, media, id, media, version, leaseToken),
    db.prepare(`INSERT INTO w_deleted_wallpaper_files (object_key, deleted_at)
      SELECT value, ? FROM json_each(?) WHERE ${owned} ON CONFLICT(object_key) DO NOTHING`)
      .bind(version, JSON.stringify(keys), id, media, version, leaseToken),
  ]);
  if (claimed[0].meta.changes !== 1) throw new Error(texts.adminDeviceDeleteChanged);
  try {
    let next = 0;
    const workers = await Promise.allSettled(Array.from({ length: Math.min(4, keys.length) }, async () => {
      while (next < keys.length) await deleteR2Object(keys[next++]);
    }));
    const failure = workers.find((result) => result.status === 'rejected');
    if (failure?.status === 'rejected') throw failure.reason;
    const translationTable = media === 'dynamic' ? 'w_live_device_i18n' : 'w_device_i18n';
    const removed = await db.batch([
      db.prepare(`DELETE FROM w_wallpapers WHERE device_id = ? AND media_type = ? AND updated_date = ?
        AND deletion_state = 'processing' AND ${owned}`).bind(id, media, version, id, media, version, leaseToken),
      db.prepare(`DELETE FROM ${translationTable} WHERE device_id = ? AND ${owned}`).bind(id, id, media, version, leaseToken),
      // Check lease ownership before removing the device; its foreign key cascades the owned lock.
      db.prepare(`DELETE FROM w_devices WHERE id = ? AND deletion_state = 'none' AND ${owned}
        AND NOT EXISTS (SELECT 1 FROM w_wallpapers WHERE device_id = ?)
        AND NOT EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id = ? AND media_type != ?)
        AND NOT EXISTS (SELECT 1 FROM w_collection_i18n WHERE device_id = ?)`)
        .bind(id, id, media, version, leaseToken, id, id, media, id),
      db.prepare(`DELETE FROM w_collection_deletions WHERE device_id = ? AND media_type = ? AND updated_date = ?
        AND lease_token = ? AND deletion_state = 'processing' AND NOT EXISTS
          (SELECT 1 FROM w_wallpapers WHERE device_id = ? AND media_type = ?)`).bind(id, media, version, leaseToken, id, media),
    ]);
    if (removed[2].meta.changes !== 1 && removed[3].meta.changes !== 1) throw new Error(texts.adminDeviceDeleteChanged);
    return { id, deleted: true, device_deleted: removed[2].meta.changes === 1 };
  } catch (error) {
    await db.batch([
      db.prepare(`UPDATE w_wallpapers SET deletion_state = 'pending' WHERE device_id = ? AND media_type = ?
        AND updated_date = ? AND deletion_state = 'processing' AND ${owned}`).bind(id, media, version, id, media, version, leaseToken),
      db.prepare(`UPDATE w_collection_deletions SET deletion_state = 'pending' WHERE device_id = ? AND media_type = ?
        AND updated_date = ? AND lease_token = ? AND deletion_state = 'processing'`).bind(id, media, version, leaseToken),
    ]);
    throw new Error(`${error instanceof Error ? error.message : 'R2 文件删除失败'}；${texts.adminCollectionDeleteRetryHint}`);
  }
}
