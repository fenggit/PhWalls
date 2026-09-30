import { getWallpaperDb, type DeviceCategory, type DeviceRow, type RecordStatus, type WallpaperRow } from '@/lib/wallpaper-db';
import { slugifyWallpaperName } from '@/lib/wallpaper-data';
import { findAdminBrand } from '@/lib/admin-brands';
import { isUniqueConstraintError, normalizeAdminDisplay, normalizeAdminName } from '@/lib/admin-identity';
import { deleteR2Object, headR2Object } from '@/lib/r2-upload';
import { hasStaticWallpaperReference } from '@/lib/admin-static-assets';

const categories = new Set<DeviceCategory>(['phone', 'phone_fold', 'pad', 'desktop', 'os']);
const statuses = new Set<RecordStatus>(['draft', 'published', 'unpublished']);
const themes = new Set(['dark', 'light', 'normal']);
const mediaTypes = new Set(['static', 'dynamic']);
const imageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif']);
const videoExtensions = new Set(['mp4', 'webm']);
const availableFilesClause = `NOT EXISTS (SELECT 1 FROM w_wallpapers deleting
  WHERE deleting.deletion_state != 'none' AND (deleting.origin_key IN (?, ?) OR deleting.compress_key IN (?, ?)))`;

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

function deletionKey(raw: string, role: 'origin' | 'compress'): string {
  const parts = raw.split('/');
  if (!raw || raw.length > 500 || raw.startsWith('/') || raw.includes('\\') || raw.includes('://') ||
      /[\u0000-\u001f\u007f]/.test(raw) || parts.some((part) => !part || part === '.' || part === '..') ||
      parts.indexOf(role) < 1 || parts[parts.length - 1] === role) throw new Error('已存文件路径无效，无法删除');
  return raw;
}

export async function listAdminDevices(filters: URLSearchParams): Promise<DeviceRow[]> {
  const clauses: string[] = [];
  const values: string[] = [];
  for (const [param, column] of [['brand', 'brand_name'], ['category', 'device_category'], ['status', 'status']] as const) {
    const value = filters.get(param);
    if (value) { clauses.push(`${column} = ?`); values.push(value); }
  }
  const name = filters.get('name');
  if (name) { clauses.push('name_key = ?'); values.push(normalizeAdminName(assertText(name, '设备名称'))); }
  const popular = filters.get('popular');
  if (popular === '0' || popular === '1') { clauses.push('is_popular_brand = ?'); values.push(popular); }
  const sql = `SELECT * FROM w_devices ${clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''} ORDER BY updated_date DESC, device_name LIMIT 1500`;
  return (await getWallpaperDb().prepare(sql).bind(...values).all<DeviceRow>()).results;
}

export async function createAdminDevice(input: Record<string, unknown>): Promise<DeviceRow> {
  const brand = slugifyWallpaperName(assertText(input.brand_name, '品牌', 80));
  const brandInfo = await findAdminBrand(brand);
  if (!brandInfo) throw new Error('请选择现有品牌');
  const name = normalizeAdminDisplay(assertText(input.device_name, '设备名称'));
  const nameKey = normalizeAdminName(name);
  const slug = slugifyWallpaperName(name);
  if (!brand || !slug) throw new Error('品牌或设备名称无法生成 URL');
  const selectedCategory = category(input.device_category);
  if ((brandInfo.kind === 'desktop') !== (selectedCategory === 'desktop')) throw new Error('品牌类型与设备分类不匹配');
  const releaseDate = input.release_date ? assertText(input.release_date, '发布日期', 20) : '';
  const now = Date.now();
  const id = crypto.randomUUID();
  const db = getWallpaperDb();
  const { results: existing } = await db.prepare(
    'SELECT device_name, device_slug, is_popular_brand FROM w_devices WHERE brand_name = ?'
  ).bind(brand).all<Pick<DeviceRow, 'device_name' | 'device_slug' | 'is_popular_brand'>>();
  if (existing.some((device) => normalizeAdminName(device.device_name) === nameKey)) {
    throw new Error('该品牌下设备或系统名称已存在');
  }
  if (existing.some((device) => device.device_slug === slug)) throw new Error('该品牌下设备或系统 URL 标识已存在');
  try {
    await db.prepare(
      `INSERT INTO w_devices (id,brand_name,device_name,name_key,device_slug,device_category,brand_logo,device_splash_url,
        is_popular_brand,release_date,status,create_date,updated_date) VALUES (?,?,?,?,?,?,?,?,?,?,'draft',?,?)`
    ).bind(id, brand, name, nameKey, slug, selectedCategory,
      typeof input.brand_logo === 'string' ? input.brand_logo || null : null,
      typeof input.device_splash_url === 'string' ? input.device_splash_url || null : null,
      existing[0]?.is_popular_brand ?? 0, releaseDate, now, now).run();
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error('该品牌下设备或系统已存在');
    throw error;
  }
  return (await db.prepare('SELECT * FROM w_devices WHERE id = ?').bind(id).first<DeviceRow>())!;
}

export async function updateAdminDevice(input: Record<string, unknown>): Promise<DeviceRow> {
  const id = assertText(input.id, '设备 ID', 80);
  const db = getWallpaperDb();
  const previous = await db.prepare('SELECT * FROM w_devices WHERE id = ?').bind(id).first<DeviceRow>();
  if (!previous) throw new Error('设备不存在');
  const name = input.device_name === undefined ? previous.device_name : normalizeAdminDisplay(assertText(input.device_name, '设备名称'));
  const nameKey = normalizeAdminName(name);
  const previousNameKey = normalizeAdminName(previous.device_name);
  if (nameKey !== previousNameKey) {
    const { results } = await db.prepare('SELECT id, device_name FROM w_devices WHERE brand_name = ? AND id != ?')
      .bind(previous.brand_name, id).all<Pick<DeviceRow, 'id' | 'device_name'>>();
    if (results.some((device) => normalizeAdminName(device.device_name) === nameKey)) {
      throw new Error('该品牌下设备或系统名称已存在');
    }
  }
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
  try {
    await db.prepare(
      `UPDATE w_devices SET device_name = ?, name_key = ?, device_category = ?, brand_logo = ?, device_splash_url = ?,
        release_date = ?, status = ?, updated_date = ? WHERE id = ?`
    ).bind(name, nameKey === previousNameKey ? previous.name_key : nameKey, selectedCategory,
      input.brand_logo === undefined ? previous.brand_logo : input.brand_logo || null,
      input.device_splash_url === undefined ? previous.device_splash_url : input.device_splash_url || null,
      input.release_date === undefined ? previous.release_date : String(input.release_date || ''),
      nextStatus, now, id).run();
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error('该品牌下设备或系统已存在');
    throw error;
  }
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
  const inserted = await db.prepare(
    `INSERT INTO w_wallpapers (id,device_id,name,mime_type,size_bytes,origin_key,compress_key,width,height,file_format,
      theme,media_type,category,is_primary,tags,status,create_date,updated_date)
     SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,'draft',?,? WHERE ${availableFilesClause}`
  ).bind(id, deviceId, name, assertText(input.mime_type, 'MIME 类型', 100), size, origin, preview,
    input.width || null, input.height || null, extension, selectedTheme, media, selectedCategory,
    tags(input.tags || []), now, now, origin, preview, origin, preview).run();
  if (inserted.meta.changes !== 1) throw new Error('文件正在删除，无法创建引用这些文件的壁纸');
  return (await db.prepare('SELECT * FROM w_wallpapers WHERE id = ?').bind(id).first<WallpaperRow>())!;
}

export async function updateAdminWallpaper(input: Record<string, unknown>): Promise<WallpaperRow> {
  const db = getWallpaperDb();
  const id = assertText(input.id, '壁纸 ID', 80);
  const previous = await db.prepare('SELECT * FROM w_wallpapers WHERE id = ?').bind(id).first<WallpaperRow>();
  if (!previous) throw new Error('壁纸不存在');
  if (previous.deletion_state !== 'none') throw new Error('壁纸正在删除或等待重试，无法编辑或重新发布');
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
      file_format = ?, theme = ?, media_type = ?, category = ?, is_primary = ?, tags = ?, status = ?, updated_date = ?
     WHERE id = ? AND deletion_state = 'none' AND ${availableFilesClause}`
  ).bind(input.name === undefined ? previous.name : assertText(input.name, '壁纸名称'),
    input.mime_type === undefined ? previous.mime_type : assertText(input.mime_type, 'MIME 类型', 100),
    size, origin, preview, input.width === undefined ? previous.width : input.width || null,
    input.height === undefined ? previous.height : input.height || null,
    origin.split('.').pop()!.toLowerCase(), nextTheme, media, selectedCategory, primary,
    input.tags === undefined ? previous.tags : tags(input.tags), nextStatus, now, id, origin, preview, origin, preview);
  if (primary) {
    const results = await db.batch([
      db.prepare(`UPDATE w_wallpapers SET is_primary = 0, updated_date = ? WHERE device_id = ? AND category = ? AND id != ? AND is_primary = 1 AND EXISTS (SELECT 1 FROM w_wallpapers target WHERE target.id = ? AND target.deletion_state = 'none') AND ${availableFilesClause}`)
        .bind(now, previous.device_id, selectedCategory, id, id, origin, preview, origin, preview), update,
    ]);
    if (results[1].meta.changes !== 1) throw new Error('壁纸已进入删除流程，请刷新后重试');
  } else {
    const result = await update.run();
    if (result.meta.changes !== 1) throw new Error('壁纸已进入删除流程，请刷新后重试');
  }
  return (await db.prepare('SELECT * FROM w_wallpapers WHERE id = ?').bind(id).first<WallpaperRow>())!;
}

export async function deleteAdminWallpaper(input: Record<string, unknown>): Promise<{ id: string; deleted: true }> {
  const id = assertText(input.id, '壁纸 ID', 80);
  const db = getWallpaperDb();
  const previous = await db.prepare('SELECT * FROM w_wallpapers WHERE id = ?').bind(id).first<WallpaperRow>();
  if (!previous) return { id, deleted: true };
  if (previous.deletion_state === 'processing' && Date.now() - previous.updated_date < 120000) {
    throw new Error('壁纸正在删除，请稍后重试；中断的操作可在两分钟后重试');
  }
  const origin = deletionKey(previous.origin_key, 'origin');
  const preview = previous.compress_key ? deletionKey(previous.compress_key, 'compress') : null;
  const keys = Array.from(new Set([origin, preview].filter((key): key is string => Boolean(key))));
  if (await hasStaticWallpaperReference(keys)) {
    throw new Error('文件仍被前台 JSON 数据引用，请先移除静态配置中的引用并同步公开站点后再删除');
  }
  const parent = await db.prepare('SELECT status FROM w_devices WHERE id = ?').bind(previous.device_id)
    .first<{ status: RecordStatus }>();
  if (previous.status === 'published' && previous.is_primary && parent?.status === 'published') {
    throw new Error('这是已发布设备的主展示壁纸，请先设置另一张主图或取消发布设备');
  }
  const shared = await db.prepare(
    'SELECT id FROM w_wallpapers WHERE id != ? AND (origin_key IN (?, ?) OR compress_key IN (?, ?)) LIMIT 1'
  ).bind(id, origin, preview, origin, preview).first<{ id: string }>();
  if (shared) throw new Error('原图或预览图仍被其他壁纸引用，请先处理关联记录');

  // 先下架；R2 与 D1 不能跨服务原子提交，保留记录可让部分失败的删除重试。
  const version = Math.max(Date.now(), previous.updated_date + 1);
  const claim = db.prepare(
    `UPDATE w_wallpapers SET status = 'unpublished', is_primary = 0, deletion_state = 'processing', updated_date = ?
     WHERE id = ? AND updated_date = ? AND origin_key = ? AND compress_key IS ?
       AND status = ? AND is_primary = ? AND deletion_state = ?
       AND NOT EXISTS (SELECT 1 FROM w_devices d WHERE d.id = w_wallpapers.device_id
         AND d.status = 'published' AND w_wallpapers.status = 'published' AND w_wallpapers.is_primary = 1)
       AND NOT EXISTS (SELECT 1 FROM w_wallpapers other WHERE other.id != ?
         AND (other.origin_key IN (?, ?) OR other.compress_key IN (?, ?)))`
  ).bind(version, id, previous.updated_date, origin, preview, previous.status, previous.is_primary, previous.deletion_state,
    id, origin, preview, origin, preview);
  const claimed = await db.batch([claim, ...keys.map((key) => db.prepare(
    `INSERT INTO w_deleted_wallpaper_files (object_key, deleted_at)
     SELECT ?, ? WHERE EXISTS (SELECT 1 FROM w_wallpapers WHERE id = ? AND updated_date = ? AND deletion_state = 'processing')
     ON CONFLICT(object_key) DO NOTHING`
  ).bind(key, version, id, version))]);
  if (claimed[0].meta.changes !== 1) throw new Error('壁纸或关联记录已变更，请刷新后再删除');
  try {
    for (const key of keys) await deleteR2Object(key);
    const removed = await db.prepare(
      "DELETE FROM w_wallpapers WHERE id = ? AND updated_date = ? AND deletion_state = 'processing' AND status = 'unpublished' AND origin_key = ? AND compress_key IS ?"
    ).bind(id, version, origin, preview).run();
    if (removed.meta.changes !== 1) throw new Error('后台记录发生变更，请刷新后检查');
  } catch (error) {
    await db.prepare("UPDATE w_wallpapers SET deletion_state = 'pending' WHERE id = ? AND updated_date = ? AND deletion_state = 'processing'")
      .bind(id, version).run();
    throw new Error(`${error instanceof Error ? error.message : 'R2 文件删除失败'}；壁纸已下架并保留记录，请重试删除`);
  }
  return { id, deleted: true };
}
