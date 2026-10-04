import { getWallpaperDb, type DeviceI18nListRow, type DeviceI18nRow } from '@/lib/wallpaper-db';
import { isLanguage } from '@/lib/language';

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
  return { id, language: input.language };
}

function optionalText(value: unknown, label: string, max: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > max) throw new Error(`${label}需为最多 ${max} 字的文本`);
  return value.trim() || null;
}

export async function listAdminDeviceI18n(rawDeviceId: unknown): Promise<DeviceI18nRow[]> {
  const id = deviceId(rawDeviceId);
  const db = getWallpaperDb();
  await requireDevice(db, id);
  const { results } = await db.prepare('SELECT * FROM w_device_i18n WHERE device_id = ? ORDER BY language')
    .bind(id).all<DeviceI18nRow>();
  return results;
}

export async function listAdminDeviceI18nDirectory(filters: URLSearchParams): Promise<{
  rows: DeviceI18nListRow[]; total: number; page: number; pageSize: number;
}> {
  const clauses: string[] = [];
  const values: string[] = [];
  const brand = filters.get('brand');
  if (brand) {
    if (brand.length > 80) throw new Error('品牌无效');
    clauses.push('d.brand_name = ?'); values.push(brand);
  }
  const language = filters.get('language');
  if (language) {
    if (!isLanguage(language)) throw new Error('语言无效');
    clauses.push('i.language = ?'); values.push(language);
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
  const from = `FROM w_device_i18n i JOIN w_devices d ON d.id = i.device_id ${where}`;
  const db = getWallpaperDb();
  const count = await db.prepare(`SELECT COUNT(*) AS total ${from}`).bind(...values).first<{ total: number }>();
  const total = count?.total || 0;
  const pageSize = 50;
  const requested = Number(filters.get('page'));
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const page = Number.isSafeInteger(requested) && requested >= 0 ? Math.min(requested, lastPage) : 0;
  const { results } = await db.prepare(`SELECT i.*, d.device_name, d.brand_name ${from}
    ORDER BY i.updated_date DESC, d.device_name, i.language, i.id LIMIT ? OFFSET ?`)
    .bind(...values, pageSize, page * pageSize).all<DeviceI18nListRow>();
  return { rows: results, total, page, pageSize };
}

// POST replaces the selected language's three fields; omitted/blank values clear a field.
export async function saveAdminDeviceI18n(input: Record<string, unknown>): Promise<DeviceI18nRow> {
  const { id, language } = translationTarget(input);
  const displayName = optionalText(input.display_name, '设备名称', 200);
  const seoTitle = optionalText(input.seo_title, 'SEO 标题', 200);
  const description = optionalText(input.description, '合集描述', 5000);
  if (!displayName && !seoTitle && !description) throw new Error('设备名称、SEO 标题和描述至少填写一项');
  const db = getWallpaperDb();
  await requireDevice(db, id);
  const now = Date.now();
  await db.prepare(`INSERT INTO w_device_i18n (id, device_id, language, display_name, seo_title, description, create_date, updated_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (device_id, language) DO UPDATE SET display_name = excluded.display_name,
      seo_title = excluded.seo_title, description = excluded.description, updated_date = excluded.updated_date`)
    .bind(crypto.randomUUID(), id, language, displayName, seoTitle, description, now, now).run();
  const result = await db.prepare('SELECT * FROM w_device_i18n WHERE device_id = ? AND language = ?')
    .bind(id, language).first<DeviceI18nRow>();
  if (!result) throw new Error('多语言内容保存失败，请刷新后重试');
  return result;
}

export async function deleteAdminDeviceI18n(input: Record<string, unknown>): Promise<{ deleted: true }> {
  const { id, language } = translationTarget(input);
  const db = getWallpaperDb();
  await requireDevice(db, id);
  await db.prepare('DELETE FROM w_device_i18n WHERE device_id = ? AND language = ?').bind(id, language).run();
  return { deleted: true };
}
