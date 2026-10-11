import type { Language } from '@/types';
import type {
  WallpaperRow,
  WallpaperMediaType,
  DeviceCategory,
} from '@/lib/wallpaper-db';
import { normalizeCategoryType } from '@/lib/brands';
import {
  sanitizeWallpaperKey,
  sanitizeWallpaperDownloadKey,
} from '@/lib/wallpaper-key';

export type MiniKind = 'phone' | 'live' | 'desktop';
export type MiniOptions = {
  kind: MiniKind | null;
  brand: string | null;
  query: string;
  page: number;
  pageSize: number;
  language: Language;
};
export type MiniId = {
  deviceId: string;
  mediaType: WallpaperMediaType;
  wallpaperId?: string;
};
export type MiniRow = WallpaperRow & {
  brand_name: string;
  brand_title: string;
  brand_kind: 'mobile' | 'desktop';
  device_name: string;
  device_slug: string;
  device_category: DeviceCategory;
  release_date: string;
  display_name: string;
  description: string | null;
  device_updated_date: number;
  wallpaper_count?: number;
};
export type MiniSql = { sql: string; params: (string | number)[] };
export class MiniApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
function invalid(message: string): never {
  throw new MiniApiError(400, 'INVALID_ARGUMENT', message);
}
export function parseMiniOptions(params: URLSearchParams): MiniOptions {
  for (const name of ['kind', 'brand', 'q', 'page', 'pageSize', 'lang']) {
    if (params.getAll(name).length > 1) invalid(`Duplicate parameter: ${name}`);
  }
  const kind = params.get('kind');
  if (kind !== null && !['phone', 'live', 'desktop'].includes(kind))
    invalid('kind must be phone, live or desktop');
  const rawBrand = params.get('brand');
  const brand = rawBrand === null ? null : normalizeCategoryType(rawBrand);
  if (
    brand !== null &&
    (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(brand) || brand.length > 80)
  )
    invalid('Invalid brand slug');
  const query = (params.get('q') || '').normalize('NFKC').trim();
  if (query.length > 100 || query.split(/\s+/).length > 8)
    invalid('Search is too long');
  const language = params.get('lang') || 'zh';
  if (!['en', 'zh', 'ja', 'vi', 'zh-hant'].includes(language))
    invalid('Unsupported language');
  const integer = (name: string, fallback: number, max: number): number => {
    const raw = params.get(name);
    if (raw === null) return fallback;
    if (!/^[1-9]\d*$/.test(raw) || Number(raw) > max)
      invalid(`Invalid ${name}`);
    return Number(raw);
  };
  return {
    kind: kind as MiniKind | null,
    brand,
    query,
    page: integer('page', 1, 10000),
    pageSize: integer('pageSize', 24, 60),
    language: language as Language,
  };
}
export function parseMiniId(value: string, wallpaper = false): MiniId {
  const match = value.match(
    /^([a-zA-Z0-9_-]{1,80}):(static|dynamic)(?::([a-zA-Z0-9_-]{1,80}))?$/,
  );
  if (!match || Boolean(match[3]) !== wallpaper) invalid('Invalid resource ID');
  return {
    deviceId: match[1],
    mediaType: match[2] as WallpaperMediaType,
    ...(wallpaper ? { wallpaperId: match[3] } : {}),
  };
}
export function miniKind(
  row: Pick<MiniRow, 'media_type' | 'brand_kind' | 'device_category'>,
): MiniKind {
  return row.media_type === 'dynamic'
    ? 'live'
    : row.brand_kind === 'desktop' || row.device_category === 'desktop'
      ? 'desktop'
      : 'phone';
}
export function miniCollectionId(
  row: Pick<WallpaperRow, 'device_id' | 'media_type'>,
): string {
  return `${row.device_id}:${row.media_type}`;
}
export function miniMediaLinks(
  row: Pick<WallpaperRow, 'origin_key' | 'compress_key' | 'media_type'>,
  origin: string,
) {
  const key = sanitizeWallpaperDownloadKey(row.origin_key);
  if (!key) throw new Error('Invalid published wallpaper key');
  const preview = sanitizeWallpaperKey(
    row.compress_key || (row.media_type === 'static' ? row.origin_key : ''),
  );
  const proxy = (pathname: string, value: string) =>
    `${origin}${pathname}?key=${encodeURIComponent(value)}`;
  return {
    previewUrl: preview ? proxy('/api/public/wallpaper-image', preview) : null,
    downloadUrl: proxy('/api/files/download', key),
    videoUrl:
      row.media_type === 'dynamic' ? proxy('/api/files/preview', key) : null,
  };
}
export function miniPagination(total: number, options: MiniOptions) {
  return {
    page: options.page,
    pageSize: options.pageSize,
    total,
    totalPages: Math.ceil(total / options.pageSize),
    hasMore: options.page * options.pageSize < total,
  };
}
export function toMiniCollection(
  row: MiniRow,
  origin: string,
  brandTitle: string,
) {
  return {
    id: miniCollectionId(row),
    brand: row.brand_name,
    brandTitle,
    name: row.display_name,
    slug: row.device_slug,
    kind: miniKind(row),
    mediaType: row.media_type,
    deviceCategory: row.device_category,
    date: row.release_date,
    description: row.description || '',
    count: row.wallpaper_count || 0,
    coverUrl: miniMediaLinks(row, origin).previewUrl,
  };
}
export function toMiniWallpaper(
  row: MiniRow,
  origin: string,
  brandTitle: string,
) {
  let tags: string[] = [];
  try {
    tags = (JSON.parse(row.tags) as unknown[]).filter(
      (tag): tag is string => typeof tag === 'string',
    );
  } catch {
    /* tolerate legacy metadata */
  }
  return {
    id: `${miniCollectionId(row)}:${row.id}`,
    collectionId: miniCollectionId(row),
    name: row.name,
    collectionName: row.display_name,
    brand: row.brand_name,
    brandTitle,
    kind: miniKind(row),
    mediaType: row.media_type,
    mimeType: row.mime_type,
    format: row.file_format,
    sizeBytes: row.size_bytes,
    width: row.width,
    height: row.height,
    theme: row.theme,
    tags,
    updatedAt: new Date(
      Math.max(row.updated_date, row.device_updated_date),
    ).toISOString(),
    canSaveToAlbum: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
    ].includes(row.mime_type),
    ...miniMediaLinks(row, origin),
  };
}
const LIKE_ESCAPE = " ESCAPE '\\'";
const like = (word: string) => `%${word.replace(/[\\%_]/g, '\\$&')}%`;
export function miniVisibleSql(
  options: MiniOptions,
  brandTitles: Record<string, string> = {},
  id?: MiniId,
): MiniSql {
  const params: (string | number)[] = [options.language];
  const where = [
    "d.status = 'published'",
    "w.status = 'published'",
    "w.deletion_state = 'none'",
  ];
  if (options.kind === 'live') where.push("w.media_type = 'dynamic'");
  if (options.kind === 'phone')
    where.push(
      "w.media_type = 'static' AND b.kind <> 'desktop' AND d.device_category <> 'desktop'",
    );
  if (options.kind === 'desktop')
    where.push(
      "w.media_type = 'static' AND (b.kind = 'desktop' OR d.device_category = 'desktop')",
    );
  if (options.brand) {
    where.push('d.brand_name = ?');
    params.push(options.brand);
  }
  for (const word of options.query.split(/\s+/).filter(Boolean)) {
    const brands = Object.entries(brandTitles)
      .filter(([, title]) => title.toLowerCase().includes(word.toLowerCase()))
      .map(([slug]) => slug);
    where.push(
      `(d.device_name LIKE ?${LIKE_ESCAPE} OR d.brand_name LIKE ?${LIKE_ESCAPE} OR b.title LIKE ?${LIKE_ESCAPE} OR COALESCE(local.display_name, english.display_name, '') LIKE ?${LIKE_ESCAPE}${brands.length ? ` OR d.brand_name IN (${brands.map(() => '?').join(',')})` : ''})`,
    );
    params.push(like(word), like(word), like(word), like(word), ...brands);
  }
  if (id) {
    where.push('w.device_id = ? AND w.media_type = ?');
    params.push(id.deviceId, id.mediaType);
    if (id.wallpaperId) {
      where.push('w.id = ?');
      params.push(id.wallpaperId);
    }
  }
  return {
    sql: `SELECT w.*, d.brand_name, b.title AS brand_title, b.kind AS brand_kind,
    d.device_name, d.device_slug, d.device_category, d.release_date, d.updated_date AS device_updated_date,
    COALESCE(local.display_name, english.display_name, d.device_name) AS display_name,
    COALESCE(local.description, english.description) AS description
    FROM w_wallpapers w JOIN w_devices d ON d.id = w.device_id JOIN w_brands b ON b.slug = d.brand_name
    LEFT JOIN w_collection_i18n local ON local.device_id = d.id AND local.media_type = w.media_type AND local.language = ?
    LEFT JOIN w_collection_i18n english ON english.device_id = d.id AND english.media_type = w.media_type AND english.language = 'en'
    WHERE ${where.join(' AND ')}`,
    params,
  };
}
// Normalize partial and non-padded source dates numerically before paginating.
export const MINI_RELEASE_ORDER_SQL = `CAST(substr(release_date, 1, 4) AS INTEGER) DESC,
  CASE WHEN length(release_date) > 4 THEN CAST(substr(replace(release_date, '-', '/'), 6) AS INTEGER) ELSE 1 END DESC,
  CASE WHEN instr(substr(replace(release_date, '-', '/'), 6), '/') > 0
    THEN CAST(substr(substr(replace(release_date, '-', '/'), 6), instr(substr(replace(release_date, '-', '/'), 6), '/') + 1) AS INTEGER) ELSE 1 END DESC`;
export const MINI_ASSET_ORDER_SQL =
  'is_primary DESC, create_date ASC, name ASC, id ASC';
