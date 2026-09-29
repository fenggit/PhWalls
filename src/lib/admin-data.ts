import { getWallpaperDb, type DeviceCategory, type DeviceRow, type RecordStatus, type WallpaperRow } from '@/lib/wallpaper-db';
import { slugifyWallpaperName } from '@/lib/wallpaper-data';
import { findAdminBrand } from '@/lib/admin-brands';
import { headR2Object } from '@/lib/r2-upload';

const categories = new Set<DeviceCategory>(['phone', 'phone_fold', 'pad', 'desktop', 'os']);
const statuses = new Set<RecordStatus>(['draft', 'published', 'unpublished']);
const themes = new Set(['dark', 'light', 'normal']);
const mediaTypes = new Set(['static', 'dynamic']);
const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif']);
const videoExtensions = new Set(['mp4', 'webm']);

export function assertText(value: unknown, label: string, max = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label} 无效`);
  return value.trim();
}

function category(value: unknown): DeviceCategory {
  if (!categories.has(value as DeviceCategory)) throw new Error('分类无效');
  return value as DeviceCategory;
}

function status(value: unknown): RecordStatus {
  if (!statuses.has(value as RecordStatus)) throw new Error('状态无效');
  return value as RecordStatus;
}

function tags(value: unknown): string {
  if (!Array.isArray(value) || value.length > 20 || value.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.length > 40)) {
    throw new Error('标签无效');
  }
  return JSON.stringify(Array.from(new Set(value.map((tag: string) => tag.trim()))));
}

function validKey(raw: unknown, role: 'origin' | 'compress', media: 'static' | 'dynamic'): string {
  const value = assertText(raw, '文件 key', 500);
  const extension = value.split('.').pop()?.toLowerCase() || '';
  const allowed = role === 'origin' && media === 'dynamic' ? videoExtensions : imageExtensions;
  if (!value.includes(`/${role}/`) || value.includes('..') || value.includes('\\') || value.startsWith('/') ||
      /[\u0000-\u001f\u007f]/.test(value) || !allowed.has(extension)) throw new Error('文件 key 无效');
  return value;
}

export async function listAdminDevices(filters: URLSearchParams): Promise<DeviceRow[]> {
  const clauses: string[] = [];
  const values: string[] = [];
  for (const [param, column] of [['brand', 'brand_name'], ['category', 'device_category'], ['status', 'status']] as const) {
    const value = filters.get(param);
    if (value) { clauses.push(`${column} = ?`); values.push(value); }
  }
  const popular = filters.get('popular');
  if (popular === '0' || popular === '1') { clauses.push('is_popular_brand = ?'); values.push(popular); }
  const sql = `SELECT * FROM w_devices ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY updated_date DESC, device_name LIMIT 1500`;
  return (await getWallpaperDb().prepare(sql).bind(...values).all<DeviceRow>()).results;
}

export async function createAdminDevice(input: Record<string, unknown>): Promise<DeviceRow> {
  const brand = slugifyWallpaperName(assertText(input.brand_name, '品牌', 80));
  const brandInfo = await findAdminBrand(brand);
  if (!brandInfo) throw new Error('请选择现有品牌');
  const name = assertText(input.device_name, '设备名称');
  const slug = slugifyWallpaperName(name);
  if (!brand || !slug) throw new Error('品牌或设备名称无法生成 URL');
  const selectedCategory = category(input.device_category);
  if ((brandInfo.kind === 'desktop') !== (selectedCategory === 'desktop')) throw new Error('品牌类型与设备分类不匹配');
  const releaseDate = input.release_date ? assertText(input.release_date, '发布日期', 20) : '';
  const now = Date.now();
  const id = crypto.randomUUID();
  const existing = await getWallpaperDb().prepare('SELECT is_popular_brand FROM w_devices WHERE brand_name = ? LIMIT 1').bind(brand).first<{ is_popular_brand: number }>();
  await getWallpaperDb().prepare(
    `INSERT INTO w_devices (id,brand_name,device_name,device_slug,device_category,brand_logo,device_splash_url,
      is_popular_brand,release_date,status,create_date,updated_date) VALUES (?,?,?,?,?,?,?,?,?,'draft',?,?)`
  ).bind(id, brand, name, slug, selectedCategory,
    typeof input.brand_logo === 'string' ? input.brand_logo || null : null,
    typeof input.device_splash_url === 'string' ? input.device_splash_url || null : null,
    existing?.is_popular_brand ?? 0, releaseDate, now, now).run();
  return (await getWallpaperDb().prepare('SELECT * FROM w_devices WHERE id = ?').bind(id).first<DeviceRow>())!;
}

export async function updateAdminDevice(input: Record<string, unknown>): Promise<DeviceRow> {
  const id = assertText(input.id, '设备 ID', 80);
  const db = getWallpaperDb();
  const previous = await db.prepare('SELECT * FROM w_devices WHERE id = ?').bind(id).first<DeviceRow>();
  if (!previous) throw new Error('设备不存在');
  const name = input.device_name === undefined ? previous.device_name : assertText(input.device_name, '设备名称');
  const selectedCategory = input.device_category === undefined ? previous.device_category : category(input.device_category);
  if (selectedCategory !== previous.device_category) {
    const brandInfo = await findAdminBrand(previous.brand_name);
    if (!brandInfo || (brandInfo.kind === 'desktop') !== (selectedCategory === 'desktop')) {
      throw new Error('品牌类型与设备分类不匹配');
    }
  }
  const nextStatus = input.status === undefined ? previous.status : status(input.status);
  if (input.is_popular_brand !== undefined && input.is_popular_brand !== 0 && input.is_popular_brand !== 1) {
    throw new Error('热门品牌标记无效');
  }
  if (nextStatus === 'published' && previous.status !== 'published') {
    const check = await db.prepare(
      `SELECT COUNT(*) AS count FROM w_wallpapers WHERE device_id = ? AND status = 'published' AND is_primary = 1`
    ).bind(id).first<{ count: number }>();
    if (!check?.count) throw new Error('发布前至少需要一张已发布的主展示壁纸');
  }
  const now = Date.now();
  await db.prepare(
    `UPDATE w_devices SET device_name = ?, device_category = ?, brand_logo = ?, device_splash_url = ?,
      release_date = ?, status = ?, updated_date = ? WHERE id = ?`
  ).bind(name, selectedCategory,
    input.brand_logo === undefined ? previous.brand_logo : input.brand_logo || null,
    input.device_splash_url === undefined ? previous.device_splash_url : input.device_splash_url || null,
    input.release_date === undefined ? previous.release_date : String(input.release_date || ''),
    nextStatus, now, id).run();
  if (input.is_popular_brand !== undefined) {
    await db.prepare('UPDATE w_devices SET is_popular_brand = ?, updated_date = ? WHERE brand_name = ?')
      .bind(input.is_popular_brand, now, previous.brand_name).run();
  }
  return (await db.prepare('SELECT * FROM w_devices WHERE id = ?').bind(id).first<DeviceRow>())!;
}

export async function listAdminWallpapers(filters: URLSearchParams): Promise<{
  rows: Array<WallpaperRow & { device_name: string; brand_name: string }>;
  total: number;
  page: number;
  pageSize: number;
}> {
  const clauses: string[] = [];
  const values: string[] = [];
  for (const [param, column] of [['brand', 'd.brand_name'], ['device', 'w.device_id'], ['category', 'w.category'],
    ['theme', 'w.theme'], ['media', 'w.media_type'], ['format', 'w.file_format'], ['status', 'w.status']] as const) {
    const value = filters.get(param);
    if (value) { clauses.push(`${column} = ?`); values.push(value); }
  }
  const search = filters.get('search')?.trim();
  if (search) {
    clauses.push('(w.name LIKE ? OR d.device_name LIKE ?)');
    values.push(`%${search}%`, `%${search}%`);
  }
  const requestedPage = Number(filters.get('page'));
  const pageSize = 50;
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const db = getWallpaperDb();
  const count = await db.prepare(`SELECT COUNT(*) AS total FROM w_wallpapers w JOIN w_devices d ON d.id = w.device_id ${where}`)
    .bind(...values).first<{ total: number }>();
  const total = count?.total || 0;
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage >= 0 ? Math.min(requestedPage, lastPage) : 0;
  const sql = `SELECT w.*, d.device_name, d.brand_name FROM w_wallpapers w JOIN w_devices d ON d.id = w.device_id
    ${where} ORDER BY w.create_date DESC, w.name, w.id LIMIT ? OFFSET ?`;
  const { results } = await db.prepare(sql).bind(...values, pageSize, page * pageSize)
    .all<WallpaperRow & { device_name: string; brand_name: string }>();
  return { rows: results, total, page, pageSize };
}

export async function createAdminWallpaper(input: Record<string, unknown>): Promise<WallpaperRow> {
  const db = getWallpaperDb();
  const deviceId = assertText(input.device_id, '设备 ID', 80);
  const device = await db.prepare('SELECT * FROM w_devices WHERE id = ?').bind(deviceId).first<DeviceRow>();
  if (!device) throw new Error('设备不存在');
  const name = assertText(input.name, '壁纸名称');
  const media = input.media_type || 'static';
  if (!mediaTypes.has(media as string)) throw new Error('媒体类型无效');
  const origin = validKey(input.origin_key, 'origin', media as 'static' | 'dynamic');
  const preview = input.compress_key ? validKey(input.compress_key, 'compress', media as 'static' | 'dynamic') : null;
  const selectedCategory = category(input.category || device.device_category);
  const selectedTheme = input.theme || 'normal';
  if (!themes.has(selectedTheme as string)) throw new Error('主题无效');
  const size = Number(input.size_bytes || 0);
  if (!Number.isSafeInteger(size) || size < 0) throw new Error('文件大小无效');
  const extension = origin.split('.').pop()!.toLowerCase();
  const now = Date.now();
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO w_wallpapers (id,device_id,name,mime_type,size_bytes,origin_key,compress_key,width,height,file_format,
      theme,media_type,category,is_primary,tags,status,create_date,updated_date)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,'draft',?,?)`
  ).bind(id, deviceId, name, assertText(input.mime_type, 'MIME 类型', 100), size, origin, preview,
    input.width || null, input.height || null, extension, selectedTheme, media, selectedCategory,
    tags(input.tags || []), now, now).run();
  return (await db.prepare('SELECT * FROM w_wallpapers WHERE id = ?').bind(id).first<WallpaperRow>())!;
}

export async function updateAdminWallpaper(input: Record<string, unknown>): Promise<WallpaperRow> {
  const db = getWallpaperDb();
  const id = assertText(input.id, '壁纸 ID', 80);
  const previous = await db.prepare('SELECT * FROM w_wallpapers WHERE id = ?').bind(id).first<WallpaperRow>();
  if (!previous) throw new Error('壁纸不存在');
  const media = input.media_type || previous.media_type;
  if (!mediaTypes.has(media as string)) throw new Error('媒体类型无效');
  const origin = input.origin_key === undefined ? previous.origin_key : validKey(input.origin_key, 'origin', media as 'static' | 'dynamic');
  const preview = input.compress_key === undefined ? previous.compress_key
    : input.compress_key ? validKey(input.compress_key, 'compress', media as 'static' | 'dynamic') : null;
  const selectedCategory = input.category === undefined ? previous.category : category(input.category);
  const nextStatus = input.status === undefined ? previous.status : status(input.status);
  const primary = input.is_primary === undefined ? previous.is_primary : input.is_primary;
  if (primary !== 0 && primary !== 1) throw new Error('主展示图标记无效');
  if (nextStatus === 'published' && (previous.status !== 'published' || origin !== previous.origin_key || preview !== previous.compress_key)) {
    if (!preview) throw new Error('发布前需要预览图或视频封面');
    const [originInfo, previewInfo] = await Promise.all([headR2Object(origin), headR2Object(preview)]);
    if (!originInfo || !previewInfo) throw new Error('R2 原图或预览文件不存在');
    if (input.size_bytes !== undefined && Number(input.size_bytes) !== originInfo.size) throw new Error('原图大小与 R2 不一致');
  }
  if (nextStatus === 'published' && !preview) throw new Error('已发布壁纸必须有预览图或封面');
  if (previous.status === 'published' && previous.is_primary && nextStatus !== 'published') {
    const parent = await db.prepare('SELECT status FROM w_devices WHERE id = ?').bind(previous.device_id).first<{ status: RecordStatus }>();
    if (parent?.status === 'published') throw new Error('请先取消发布设备或设置另一张主展示壁纸');
  }
  if (previous.is_primary && !primary && previous.status === 'published') {
    const other = await db.prepare(
      "SELECT COUNT(*) AS count FROM w_wallpapers WHERE device_id = ? AND category = ? AND status = 'published' AND id != ? AND is_primary = 1"
    ).bind(previous.device_id, previous.category, id).first<{ count: number }>();
    if (!other?.count && nextStatus === 'published') throw new Error('请先设置另一张主展示壁纸');
  }
  const nextTheme = input.theme || previous.theme;
  if (!themes.has(nextTheme as string)) throw new Error('主题无效');
  const size = input.size_bytes === undefined ? previous.size_bytes : Number(input.size_bytes);
  if (!Number.isSafeInteger(size) || size < 0) throw new Error('文件大小无效');
  const now = Date.now();
  const update = db.prepare(
    `UPDATE w_wallpapers SET name = ?, mime_type = ?, size_bytes = ?, origin_key = ?, compress_key = ?, width = ?, height = ?,
      file_format = ?, theme = ?, media_type = ?, category = ?, is_primary = ?, tags = ?, status = ?, updated_date = ? WHERE id = ?`
  ).bind(input.name === undefined ? previous.name : assertText(input.name, '壁纸名称'),
    input.mime_type === undefined ? previous.mime_type : assertText(input.mime_type, 'MIME 类型', 100),
    size, origin, preview, input.width === undefined ? previous.width : input.width || null,
    input.height === undefined ? previous.height : input.height || null,
    origin.split('.').pop()!.toLowerCase(), nextTheme, media, selectedCategory, primary,
    input.tags === undefined ? previous.tags : tags(input.tags), nextStatus, now, id);
  if (primary) {
    await db.batch([
      db.prepare('UPDATE w_wallpapers SET is_primary = 0, updated_date = ? WHERE device_id = ? AND category = ? AND id != ? AND is_primary = 1')
        .bind(now, previous.device_id, selectedCategory, id), update,
    ]);
  } else {
    await update.run();
  }
  return (await db.prepare('SELECT * FROM w_wallpapers WHERE id = ?').bind(id).first<WallpaperRow>())!;
}
