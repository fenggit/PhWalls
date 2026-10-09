import { getWallpaperDb, type DeviceI18nListRow, type DeviceI18nRow } from '@/lib/wallpaper-db';
import { isLanguage, SUPPORTED_LANGUAGES } from '@/lib/language';
import { parseWallpaperMedia } from '@/lib/wallpaper-media';

export type AdminDeviceI18nDirectoryRow = DeviceI18nListRow & { wallpaper_count?: number };
export type MissingDescriptionBrand = { brand_name: string; device_count: number; missing_count: number };

function deviceId(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 80) throw new Error('设备 ID 无效');
  return value.trim();
}

async function requireDevice(db: D1Database, id: string): Promise<void> {
  if (!await db.prepare('SELECT id FROM w_devices WHERE id = ?').bind(id).first()) {
    throw new Error('设备不存在');
  }
}

function translationTarget(input: Record<string, unknown>) {
  const id = deviceId(input.device_id);
  if (typeof input.language !== 'string' || !isLanguage(input.language)) throw new Error('语言无效');
  return { id, language: input.language, media: parseWallpaperMedia(input.media_type) };
}

function optionalText(value: unknown, label: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label}需为最多 ${max} 字的文本`);
  return value.trim() || null;
}

export async function listAdminDeviceI18n(rawDeviceId: unknown, rawMedia?: unknown): Promise<DeviceI18nRow[]> {
  const id = deviceId(rawDeviceId);
  const media = parseWallpaperMedia(rawMedia);
  const db = getWallpaperDb();
  await requireDevice(db, id);
  const { results } = await db.prepare('SELECT * FROM w_collection_i18n WHERE device_id = ? AND media_type = ? ORDER BY language')
    .bind(id, media).all<DeviceI18nRow>();
  return results;
}

export async function listAdminDeviceI18nDirectory(filters: URLSearchParams): Promise<{
  rows: AdminDeviceI18nDirectoryRow[]; total: number; page: number; pageSize: number;
  missingBrands: MissingDescriptionBrand[];
}> {
  const view = filters.get('view');
  if (view && view !== 'saved' && view !== 'missing') throw new Error('列表类型无效');
  const missing = view === 'missing';
  const clauses: string[] = missing ? ["NULLIF(TRIM(i.description), '') IS NULL"] : [];
  const values: string[] = missing ? [JSON.stringify(SUPPORTED_LANGUAGES)] : [];
  const media = filters.get('media');
  if (media) {
    clauses.push(`${missing ? 'w' : 'i'}.media_type = ?`); values.push(parseWallpaperMedia(media));
  }
  const brand = filters.get('brand');
  if (brand) {
    if (brand.length > 80) throw new Error('品牌无效');
    clauses.push('d.brand_name = ?'); values.push(brand);
  }
  const language = filters.get('language');
  if (language) {
    if (!isLanguage(language)) throw new Error('语言无效');
    clauses.push(`${missing ? 'l.value' : 'i.language'} = ?`); values.push(language);
  }
  const search = filters.get('search')?.trim();
  if (search) {
    if (search.length > 200) throw new Error('搜索内容最多 200 字');
    const pattern = `%${search.replace(/[\\%_]/g, '\\$&')}%`;
    clauses.push(`(d.device_name LIKE ? ESCAPE '\\' OR d.brand_name LIKE ? ESCAPE '\\'
      OR i.display_name LIKE ? ESCAPE '\\' OR i.seo_title LIKE ? ESCAPE '\\' OR i.description LIKE ? ESCAPE '\\')`);
    values.push(pattern, pattern, pattern, pattern, pattern);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const from = missing
    ? `FROM w_devices d
       JOIN (SELECT device_id, media_type, COUNT(*) AS wallpaper_count FROM w_wallpapers
         WHERE deletion_state = 'none' GROUP BY device_id, media_type) w ON w.device_id = d.id
       CROSS JOIN json_each(?) l
       LEFT JOIN w_collection_i18n i ON i.device_id = d.id AND i.media_type = w.media_type AND i.language = l.value ${where}`
    : `FROM w_collection_i18n i JOIN w_devices d ON d.id = i.device_id ${where}`;
  const db = getWallpaperDb();
  const count = await db.prepare(`SELECT COUNT(*) AS total ${from}`).bind(...values).first<{ total: number }>();
  const total = count?.total || 0;
  const pageSize = 50;
  const requested = Number(filters.get('page'));
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const page = Number.isSafeInteger(requested) && requested >= 0 ? Math.min(requested, lastPage) : 0;
  const fields = missing
    ? `COALESCE(i.id, d.id || ':' || w.media_type || ':' || l.value) AS id, d.id AS device_id, w.media_type, l.value AS language,
       i.display_name, i.seo_title, i.description, COALESCE(i.create_date, 0) AS create_date,
       COALESCE(i.updated_date, 0) AS updated_date, w.wallpaper_count, d.device_name, d.brand_name`
    : 'i.*, d.device_name, d.brand_name';
  const order = missing ? 'd.brand_name, d.device_name, d.id, w.media_type, l.value' : 'i.updated_date DESC, d.device_name, i.media_type, i.language, i.id';
  const { results } = await db.prepare(`SELECT ${fields} ${from} ORDER BY ${order} LIMIT ? OFFSET ?`)
    .bind(...values, pageSize, page * pageSize).all<AdminDeviceI18nDirectoryRow>();
  const missingBrands = missing ? (await db.prepare(`SELECT d.brand_name,
    COUNT(DISTINCT d.id || ':' || w.media_type) AS device_count, COUNT(*) AS missing_count ${from}
    GROUP BY d.brand_name ORDER BY missing_count DESC, d.brand_name`)
    .bind(...values).all<MissingDescriptionBrand>()).results : [];
  return { rows: results, total, page, pageSize, missingBrands };
}

// POST replaces the selected language's three fields; omitted/blank values clear a field.
export async function saveAdminDeviceI18n(input: Record<string, unknown>): Promise<DeviceI18nRow> {
  const { id, language, media } = translationTarget(input);
  const displayName = optionalText(input.display_name, '设备名称', 200);
  const seoTitle = optionalText(input.seo_title, 'SEO 标题', 200);
  const description = optionalText(input.description, '合集描述', 5000);
  if (!displayName && !seoTitle && !description) throw new Error('设备名称、SEO 标题和描述至少填写一项');
  const db = getWallpaperDb();
  await requireDevice(db, id);
  const now = Date.now();
  const table = media === 'dynamic' ? 'w_live_device_i18n' : 'w_device_i18n';
  await db.prepare(`INSERT INTO ${table} (id, device_id, language, display_name, seo_title, description, create_date, updated_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (device_id, language) DO UPDATE SET display_name = excluded.display_name,
      seo_title = excluded.seo_title, description = excluded.description, updated_date = excluded.updated_date`)
    .bind(crypto.randomUUID(), id, language, displayName, seoTitle, description, now, now).run();
  const result = await db.prepare('SELECT * FROM w_collection_i18n WHERE device_id = ? AND media_type = ? AND language = ?')
    .bind(id, media, language).first<DeviceI18nRow>();
  if (!result) throw new Error('多语言内容保存失败，请刷新后重试');
  return result;
}

export async function deleteAdminDeviceI18n(input: Record<string, unknown>): Promise<{ deleted: true }> {
  const { id, language, media } = translationTarget(input);
  const db = getWallpaperDb();
  await requireDevice(db, id);
  const table = media === 'dynamic' ? 'w_live_device_i18n' : 'w_device_i18n';
  await db.prepare(`DELETE FROM ${table} WHERE device_id = ? AND language = ?`).bind(id, language).run();
  return { deleted: true };
}
