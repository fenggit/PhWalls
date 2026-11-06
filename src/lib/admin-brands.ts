import { isUniqueConstraintError, normalizeAdminDisplay, normalizeAdminName } from '@/lib/admin-identity';
import { buildBuiltinAdminBrands, describeCustomAdminBrand, sortAdminBrands, type AdminBrand } from '@/lib/admin-brand-catalog';
import { getWallpaperDb, type BrandRow } from '@/lib/wallpaper-db';

export type { AdminBrand } from '@/lib/admin-brand-catalog';
type StoredBrand = Pick<BrandRow, 'slug' | 'title' | 'kind'>;

const reservedSlugs = new Set(['admin', 'api', 'desktop', 'wallpapers', 'home', 'about', 'design',
  'privacy', 'themes', 'en', 'zh', 'ja', 'vi', 'zh-hant']);

const builtinBrands: AdminBrand[] = buildBuiltinAdminBrands();

export async function listAdminBrands(): Promise<AdminBrand[]> {
  const { results } = await getWallpaperDb().prepare('SELECT slug, title, kind FROM w_brands ORDER BY create_date, title')
    .all<StoredBrand>();
  return sortAdminBrands([...builtinBrands, ...results
    .filter((brand) => !builtinBrands.some((builtin) => builtin.slug === brand.slug))
    .map(describeCustomAdminBrand)]);
}

export async function findAdminBrand(slug: string): Promise<AdminBrand | null> {
  const builtin = builtinBrands.find((brand) => brand.slug === slug);
  if (builtin) return builtin;
  const brand = await getWallpaperDb().prepare('SELECT slug, title, kind FROM w_brands WHERE slug = ?')
    .bind(slug).first<StoredBrand>();
  return brand ? describeCustomAdminBrand(brand) : null;
}

export async function createAdminBrand(input: Record<string, unknown>): Promise<AdminBrand> {
  const title = typeof input.title === 'string' ? normalizeAdminDisplay(input.title) : '';
  const slug = typeof input.slug === 'string' ? input.slug.trim().toLowerCase() : '';
  const kind = input.kind;
  if (!title || title.length > 80) throw new Error('品牌名称无效');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80) throw new Error('品牌标识只能使用小写英文、数字和连字符');
  if (reservedSlugs.has(slug)) throw new Error('品牌标识与现有页面路径冲突');
  if (kind !== 'mobile' && kind !== 'desktop') throw new Error('品牌类型无效');
  const existing = await listAdminBrands();
  if (existing.some((brand) => brand.slug === slug)) throw new Error('品牌标识已存在');
  const titleKey = normalizeAdminName(title);
  if (existing.some((brand) => normalizeAdminName(brand.title) === titleKey)) {
    throw new Error('品牌名称已存在');
  }
  const now = Date.now();
  try {
    await getWallpaperDb().prepare('INSERT INTO w_brands (slug, title, title_key, kind, create_date, updated_date) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(slug, title, titleKey, kind, now, now).run();
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error('品牌名称或标识已存在');
    throw error;
  }
  return describeCustomAdminBrand({ slug, title, kind });
}
