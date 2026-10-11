import 'server-only';
import { getWallpaperDb } from '@/lib/wallpaper-db';
import { getDeviceBrandLabel } from '@/lib/device-brand-label';
import { getTabData } from '@/lib/data';
import desktopTabs from '@/data/desktopwalls/tab.json';
import { normalizeCategoryType } from '@/lib/brands';
import {
  MiniApiError,
  miniVisibleSql,
  MINI_RELEASE_ORDER_SQL,
  MINI_ASSET_ORDER_SQL,
  parseMiniId,
  miniPagination,
  toMiniCollection,
  toMiniWallpaper,
  type MiniOptions,
  type MiniRow,
  type MiniSql,
} from '@/lib/mini-api';

function miniDb(): D1Database {
  try {
    return getWallpaperDb();
  } catch {
    throw new MiniApiError(
      503,
      'DATA_SOURCE_UNAVAILABLE',
      'Wallpaper database is unavailable',
    );
  }
}
function brandTitles(options: MiniOptions): Record<string, string> {
  return Object.fromEntries(
    [...getTabData(options.language), ...desktopTabs]
      .filter((tab) => !tab.link)
      .map((tab) => {
        const slug = normalizeCategoryType(tab.type);
        return [slug, getDeviceBrandLabel(slug, options.language, tab.title)];
      }),
  );
}
function title(
  row: Pick<MiniRow, 'brand_name' | 'brand_title'>,
  options: MiniOptions,
): string {
  return getDeviceBrandLabel(
    row.brand_name,
    options.language,
    brandTitles(options)[row.brand_name] || row.brand_title,
  );
}
function statement(
  db: D1Database,
  source: MiniSql,
  suffix: string,
  params: (string | number)[] = [],
) {
  return db
    .prepare(`WITH visible AS (${source.sql}) ${suffix}`)
    .bind(...source.params, ...params);
}
function detailOptions(options: MiniOptions): MiniOptions {
  return { ...options, kind: null, brand: null, query: '' };
}
function missing(): never {
  throw new MiniApiError(
    404,
    'NOT_FOUND',
    'Published wallpaper content was not found',
  );
}

export async function listMiniBrands(
  options: MiniOptions,
  db: D1Database = miniDb(),
) {
  const source = miniVisibleSql(options, brandTitles(options));
  const { results } = await statement(
    db,
    source,
    `SELECT brand_name AS slug, MIN(brand_title) AS title,
    MIN(brand_kind) AS kind, COUNT(*) AS wallpaperCount,
    COUNT(DISTINCT device_id || ':' || media_type) AS collectionCount
    FROM visible GROUP BY brand_name ORDER BY wallpaperCount DESC, brand_name ASC`,
  ).all<{
    slug: string;
    title: string;
    kind: 'mobile' | 'desktop';
    wallpaperCount: number;
    collectionCount: number;
  }>();
  return {
    data: results.map((row) => ({
      ...row,
      title: title({ brand_name: row.slug, brand_title: row.title }, options),
    })),
  };
}
export async function listMiniCollections(
  options: MiniOptions,
  origin: string,
  db: D1Database = miniDb(),
) {
  const source = miniVisibleSql(options, brandTitles(options));
  const [countResult, rowsResult] = await db.batch<{ total: number } | MiniRow>(
    [
      statement(
        db,
        source,
        'SELECT COUNT(*) AS total FROM (SELECT device_id, media_type FROM visible GROUP BY device_id, media_type)',
      ),
      statement(
        db,
        source,
        `, ranked AS (SELECT visible.*,
      COUNT(*) OVER (PARTITION BY device_id, media_type) AS wallpaper_count,
      ROW_NUMBER() OVER (PARTITION BY device_id, media_type ORDER BY ${MINI_ASSET_ORDER_SQL}) AS cover_rank
      FROM visible)
      SELECT * FROM ranked WHERE cover_rank = 1
      ORDER BY ${MINI_RELEASE_ORDER_SQL}, device_id ASC, media_type ASC LIMIT ? OFFSET ?`,
        [options.pageSize, (options.page - 1) * options.pageSize],
      ),
    ],
  );
  const total = (countResult.results[0] as { total: number })?.total || 0;
  return {
    data: (rowsResult.results as MiniRow[]).map((row) =>
      toMiniCollection(row, origin, title(row, options)),
    ),
    pagination: miniPagination(total, options),
  };
}
export async function getMiniCollection(
  id: string,
  options: MiniOptions,
  origin: string,
  db: D1Database = miniDb(),
) {
  const source = miniVisibleSql(detailOptions(options), {}, parseMiniId(id));
  const [summaryResult, assetsResult] = await db.batch<MiniRow>([
    statement(
      db,
      source,
      `SELECT visible.*, COUNT(*) OVER () AS wallpaper_count FROM visible ORDER BY ${MINI_ASSET_ORDER_SQL} LIMIT 1`,
    ),
    statement(
      db,
      source,
      `SELECT * FROM visible ORDER BY ${MINI_ASSET_ORDER_SQL} LIMIT ? OFFSET ?`,
      [options.pageSize, (options.page - 1) * options.pageSize],
    ),
  ]);
  const summary = summaryResult.results[0];
  if (!summary) missing();
  return {
    data: {
      collection: toMiniCollection(summary, origin, title(summary, options)),
      wallpapers: assetsResult.results.map((row) =>
        toMiniWallpaper(row, origin, title(row, options)),
      ),
    },
    pagination: miniPagination(summary.wallpaper_count || 0, options),
  };
}
export async function getMiniWallpaper(
  id: string,
  options: MiniOptions,
  origin: string,
  db: D1Database = miniDb(),
) {
  const source = miniVisibleSql(
    detailOptions(options),
    {},
    parseMiniId(id, true),
  );
  const row = await statement(
    db,
    source,
    'SELECT * FROM visible LIMIT 1',
  ).first<MiniRow>();
  if (!row) missing();
  return { data: toMiniWallpaper(row, origin, title(row, options)) };
}
