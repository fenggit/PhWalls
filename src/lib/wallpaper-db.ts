import { getOptionalRequestContext } from '@cloudflare/next-on-pages';
import type { WallpaperAsset, WallpaperCollection } from '@/lib/wallpaper-data';
import type { Language } from '@/types';
import { withWallpaperQueryCache } from '@/lib/wallpaper-query-cache';
import { sortByDateDesc } from '@/lib/data';
import { normalizeCategoryType } from '@/lib/brands';

export type RecordStatus = 'draft' | 'published' | 'unpublished';
export type WallpaperMediaType = 'static' | 'dynamic';
export type DeviceCategory = 'phone' | 'phone_fold' | 'pad' | 'desktop' | 'os';

export type BrandRow = {
  slug: string;
  title: string;
  kind: 'mobile' | 'desktop';
  create_date: number;
  updated_date: number;
};

export type DeviceRow = {
  id: string;
  brand_logo: string | null;
  brand_name: string;
  device_name: string;
  name_key: string | null;
  device_slug: string;
  device_category: DeviceCategory;
  is_popular_brand: number;
  device_splash_url: string | null;
  release_date: string;
  status: RecordStatus;
  create_date: number;
  updated_date: number;
};

export type WallpaperRow = {
  id: string;
  device_id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  origin_key: string;
  compress_key: string | null;
  width: number | null;
  height: number | null;
  file_format: string;
  theme: 'dark' | 'light' | 'normal';
  media_type: 'static' | 'dynamic';
  category: DeviceCategory;
  is_primary: number;
  tags: string;
  status: RecordStatus;
  deletion_state: 'none' | 'processing' | 'pending';
  create_date: number;
  updated_date: number;
};

export type DeviceI18nRow = {
  id: string;
  device_id: string;
  media_type: WallpaperMediaType;
  display_name: string | null;
  seo_title: string | null;
  description: string | null;
  language: Language;
  create_date: number;
  updated_date: number;
};

export type DeviceI18nListRow = DeviceI18nRow & {
  device_name: string;
  brand_name: string;
};

export function isWallpaperDbEnabled(): boolean {
  const bindings = getOptionalRequestContext()?.env as { WALLPAPER_DATA_SOURCE?: string } | undefined;
  return (bindings?.WALLPAPER_DATA_SOURCE || process.env.WALLPAPER_DATA_SOURCE) === 'd1';
}

export async function isPublishedWallpaperKey(key: string, originOnly = false): Promise<boolean> {
  if (!isWallpaperDbEnabled()) {
    if (!/\.(mp4|webm)$/i.test(key)) return true;
    const catalog = (await import('@/data/livewalls/catalog.json')).default;
    if (catalog.some((entry) => entry.status === 'published' && entry.collection.item.some((item) => item.originPath === key))) return true;
    const parts = key.split('/');
    const category = normalizeCategoryType(parts[0] === 'desktopwalls' ? parts[1] || '' : parts[0]);
    const collections = parts[0] === 'desktopwalls'
      ? await (await import('@/lib/desktop-data-server')).loadDesktopWallpaperCollections(category)
      : await (await import('@/lib/live-data-server')).loadLiveCollections(category);
    return collections.some((collection) => collection.item.some((item) => item.originPath === key && /\.(mp4|webm)$/i.test(item.originPath)));
  }
  const query = originOnly
    ? `SELECT 1 FROM w_wallpapers w JOIN w_devices d ON d.id = w.device_id
       WHERE d.status = 'published' AND w.status = 'published' AND w.origin_key = ?
         AND (? = 0 OR w.media_type = 'dynamic') LIMIT 1`
    : `SELECT 1 FROM w_wallpapers w JOIN w_devices d ON d.id = w.device_id
       WHERE d.status = 'published' AND w.status = 'published'
         AND (w.origin_key = ? OR w.compress_key = ?) LIMIT 1`;
  const result = await getWallpaperDb().prepare(query)
    .bind(...(originOnly ? [key, /\.(mp4|webm)$/i.test(key) ? 1 : 0] : [key, key])).first();
  return Boolean(result);
}

export async function getPublishedWallpaperKeys(keys: string[]): Promise<Set<string>> {
  if (!keys.length) return new Set();
  if (!isWallpaperDbEnabled()) return new Set(keys.filter((key) => !/\.(mp4|webm)$/i.test(key)));
  const { results } = await getWallpaperDb().prepare(
    `SELECT k.value AS key FROM json_each(?) k
     WHERE EXISTS (
       SELECT 1 FROM w_wallpapers w JOIN w_devices d ON d.id = w.device_id
       WHERE d.status = 'published' AND w.status = 'published'
         AND (w.origin_key = k.value OR w.compress_key = k.value)
     )`
  ).bind(JSON.stringify(keys)).all<{ key: string }>();
  return new Set(results.map((row) => row.key));
}

export function getWallpaperDb(): D1Database {
  const context = getOptionalRequestContext();
  const db = (context?.env as { DB?: D1Database } | undefined)?.DB;
  if (!db) throw new Error('D1 binding DB is unavailable. Check wrangler.toml and the Pages environment.');
  return db;
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${Number((bytes / (1024 * 1024)).toFixed(2))} MB`
    : `${Number((bytes / 1024).toFixed(2))} KB`;
}

export function toWallpaperAsset(row: WallpaperRow): WallpaperAsset {
  const tags = JSON.parse(row.tags) as string[];
  return {
    name: row.name,
    type: row.mime_type,
    size: formatSize(row.size_bytes),
    originPath: row.origin_key,
    compressPath: row.compress_key || '',
    tag: tags[0] || '',
  };
}

type LocalizedDeviceRow = DeviceRow & { display_name: string; seo_title: string | null; description: string | null };

const localizedFields = `COALESCE(local.display_name, english.display_name, d.device_name) AS display_name,
  local.seo_title, COALESCE(local.description, english.description) AS description`;
function collectionTranslationJoins(media: WallpaperMediaType): string {
  const table = media === 'dynamic' ? 'w_live_device_i18n' : 'w_device_i18n';
  return `LEFT JOIN ${table} local ON local.device_id = d.id AND local.language = ?
    LEFT JOIN ${table} english ON english.device_id = d.id AND english.language = 'en'`;
}

const mixedLocalizedFields = `COALESCE(local.display_name, live_local.display_name, english.display_name, live_english.display_name, d.device_name) AS display_name,
  COALESCE(local.seo_title, live_local.seo_title) AS seo_title,
  COALESCE(local.description, live_local.description, english.description, live_english.description) AS description`;
const mixedTranslationJoins = `LEFT JOIN w_device_i18n local ON local.device_id = d.id AND local.language = ? AND w.media_type = 'static'
  LEFT JOIN w_device_i18n english ON english.device_id = d.id AND english.language = 'en' AND w.media_type = 'static'
  LEFT JOIN w_live_device_i18n live_local ON live_local.device_id = d.id AND live_local.language = ? AND w.media_type = 'dynamic'
  LEFT JOIN w_live_device_i18n live_english ON live_english.device_id = d.id AND live_english.language = 'en' AND w.media_type = 'dynamic'`;

function toCollection(device: LocalizedDeviceRow, wallpapers: WallpaperRow[]): WallpaperCollection {
  return {
    deviceId: device.id,
    mediaType: wallpapers[0]?.media_type,
    name: device.display_name,
    seoTitle: device.seo_title,
    description: device.description,
    slug: device.device_slug,
    date: device.release_date,
    item: wallpapers.map(toWallpaperAsset),
  };
}

export async function loadDbCollections(brand: string, language: Language = 'en', media: WallpaperMediaType | null = null): Promise<WallpaperCollection[]> {
  if (media === null) {
    const collections = await Promise.all([
      loadDbCollections(brand, language, 'static'), loadDbCollections(brand, language, 'dynamic'),
    ]);
    return sortByDateDesc(collections.flat());
  }
  return withWallpaperQueryCache(['collections-media-i18n', brand, language, media], () => queryDbCollections(brand, language, media));
}

async function queryDbCollections(brand: string, language: Language, media: WallpaperMediaType): Promise<WallpaperCollection[]> {
  const db = getWallpaperDb();
  const { results: devices } = await db.prepare(
    `SELECT d.*, ${localizedFields} FROM w_devices d ${collectionTranslationJoins(media)}
     WHERE d.brand_name = ? AND d.status = 'published' ORDER BY d.release_date DESC, d.device_name`
  ).bind(language, brand).all<LocalizedDeviceRow>();
  if (!devices.length) return [];
  const { results: wallpapers } = await db.prepare(
    `SELECT w.* FROM w_wallpapers w JOIN w_devices d ON d.id = w.device_id
     WHERE d.brand_name = ? AND d.status = 'published' AND w.status = 'published'
       AND (? IS NULL OR w.media_type = ?)
     ORDER BY w.is_primary DESC, w.create_date ASC, w.name ASC`
  ).bind(brand, media, media).all<WallpaperRow>();
  const byDevice = new Map<string, WallpaperRow[]>();
  for (const wallpaper of wallpapers) {
    const list = byDevice.get(wallpaper.device_id) || [];
    list.push(wallpaper);
    byDevice.set(wallpaper.device_id, list);
  }
  return devices.filter((device) => byDevice.has(device.id))
    .map((device) => toCollection(device, byDevice.get(device.id)!));
}

export async function loadDbCollection(brand: string, slug: string, language: Language = 'en', media: WallpaperMediaType = 'static'): Promise<WallpaperCollection | null> {
  return withWallpaperQueryCache(['collection-media-i18n', brand, slug, language, media], () => queryDbCollection(brand, slug, language, media));
}

async function queryDbCollection(brand: string, slug: string, language: Language, media: WallpaperMediaType): Promise<WallpaperCollection | null> {
  const db = getWallpaperDb();
  const device = await db.prepare(
    `SELECT d.*, ${localizedFields} FROM w_devices d ${collectionTranslationJoins(media)}
     WHERE d.brand_name = ? AND d.device_slug = ? AND d.status = 'published'`
  ).bind(language, brand, slug).first<LocalizedDeviceRow>();
  if (!device) return null;
  const { results } = await db.prepare(
    "SELECT * FROM w_wallpapers WHERE device_id = ? AND status = 'published' AND (? IS NULL OR media_type = ?) ORDER BY is_primary DESC, create_date ASC, name ASC"
  ).bind(device.id, media, media).all<WallpaperRow>();
  return results.length ? toCollection(device, results) : null;
}

export async function loadDbIndex(brands: string[], language: Language = 'en', media: WallpaperMediaType | null = null): Promise<Record<string, WallpaperCollection[]>> {
  return withWallpaperQueryCache(['index-media-i18n', brands, language, media], () => queryDbIndex(brands, language, media));
}

async function queryDbIndex(brands: string[], language: Language, media: WallpaperMediaType | null): Promise<Record<string, WallpaperCollection[]>> {
  const db = getWallpaperDb();
  const index: Record<string, WallpaperCollection[]> = Object.fromEntries(brands.map((brand) => [brand, []]));
  const { results } = await db.prepare(
    `WITH ranked AS (
       SELECT w.device_id, w.media_type, w.name, w.mime_type, w.size_bytes, w.origin_key, w.compress_key, w.tags,
         COUNT(*) OVER (PARTITION BY w.device_id, w.media_type) AS count,
         ROW_NUMBER() OVER (PARTITION BY w.device_id, w.media_type ORDER BY w.is_primary DESC, w.create_date ASC, w.name ASC) AS rank
       FROM w_devices d JOIN w_wallpapers w ON w.device_id = d.id
       WHERE d.brand_name IN (SELECT value FROM json_each(?))
         AND d.status = 'published' AND w.status = 'published'
         AND (? IS NULL OR w.media_type = ?)
     )
     SELECT d.id, d.brand_name, d.device_name, d.device_slug, d.release_date, ${media ? localizedFields : mixedLocalizedFields},
       w.count, w.media_type, w.name, w.mime_type, w.size_bytes, w.origin_key, w.compress_key, w.tags
     FROM w_devices d JOIN ranked w ON w.device_id = d.id AND w.rank = 1 ${media ? collectionTranslationJoins(media) : mixedTranslationJoins}
     WHERE d.status = 'published'
     ORDER BY d.release_date DESC, d.device_name, w.media_type DESC`
  ).bind(JSON.stringify(brands), media, media, language, ...(media ? [] : [language])).all<Pick<LocalizedDeviceRow, 'id' | 'brand_name' | 'display_name' | 'seo_title' | 'description' | 'device_slug' | 'release_date'> &
    Pick<WallpaperRow, 'media_type' | 'name' | 'mime_type' | 'size_bytes' | 'origin_key' | 'compress_key' | 'tags'> & { count: number }>();
  for (const row of results) {
    if (!Object.prototype.hasOwnProperty.call(index, row.brand_name)) continue;
    index[row.brand_name].push({
      deviceId: row.id,
      mediaType: row.media_type,
      name: row.display_name,
      seoTitle: row.seo_title,
      description: row.description,
      slug: row.device_slug,
      date: row.release_date,
      count: row.count,
      item: [{ name: row.name, type: row.mime_type, size: formatSize(row.size_bytes),
        originPath: row.origin_key, compressPath: row.compress_key || '', tag: JSON.parse(row.tags)[0] || '' }],
    });
  }
  return index;
}
