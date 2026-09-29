import { BRAND_CATEGORIES } from '@/lib/brands';
import { isUniqueConstraintError, normalizeAdminDisplay, normalizeAdminName } from '@/lib/admin-identity';
import { getDesktopTabData, isDesktopWallpaperCategory } from '@/lib/desktop-data';
import { getWallpaperDb, type BrandRow } from '@/lib/wallpaper-db';

export type AdminBrand = Pick<BrandRow, 'slug' | 'title' | 'kind'> & { source: 'builtin' | 'custom' };
type StoredBrand = Pick<BrandRow, 'slug' | 'title' | 'kind'>;

const reservedSlugs = new Set(['admin', 'api', 'desktop', 'wallpapers', 'home', 'about', 'design',
  'privacy', 'en', 'zh', 'ja', 'vi', 'zh-hant']);

const builtinBrands: AdminBrand[] = [
  ...BRAND_CATEGORIES.map((brand) => ({ slug: brand.slug, title: brand.title, kind: 'mobile' as const, source: 'builtin' as const })),
  ...getDesktopTabData().filter((brand) => isDesktopWallpaperCategory(brand.type))
    .map((brand) => ({ slug: brand.type, title: brand.title, kind: 'desktop' as const, source: 'builtin' as const })),
];

export async function listAdminBrands(): Promise<AdminBrand[]> {
  const { results } = await getWallpaperDb().prepare('SELECT slug, title, kind FROM w_brands ORDER BY create_date, title')
    .all<StoredBrand>();
  return [...builtinBrands, ...results.map((brand) => ({
    slug: brand.slug, title: brand.title, kind: brand.kind, source: 'custom' as const,
  }))];
}

export async function findAdminBrand(slug: string): Promise<AdminBrand | null> {
  const builtin = builtinBrands.find((brand) => brand.slug === slug);
  if (builtin) return builtin;
  const brand = await getWallpaperDb().prepare('SELECT slug, title, kind FROM w_brands WHERE slug = ?')
    .bind(slug).first<StoredBrand>();
  return brand ? { slug: brand.slug, title: brand.title, kind: brand.kind, source: 'custom' } : null;
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
  if (existing.some((brand) => normalizeAdminName(brand.title) === normalizeAdminName(title))) {
    throw new Error('品牌名称已存在');
  }
  const now = Date.now();
  try {
    await getWallpaperDb().prepare('INSERT INTO w_brands (slug, title, title_key, kind, create_date, updated_date) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(slug, title, normalizeAdminName(title), kind, now, now).run();
  } catch (error) {
    if (isUniqueConstraintError(error)) throw new Error('品牌名称或标识已存在');
    throw error;
  }
  return { slug, title, kind, source: 'custom' };
}
