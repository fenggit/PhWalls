import { BRAND_CATEGORIES, normalizeCategoryType } from '@/lib/brands';
import { PHONE_NAVIGATION_ORDER, POPULAR_PHONE_TYPES } from '@/lib/brand-navigation';
import { getTabData } from '@/lib/data';
import { getDesktopTabData } from '@/lib/desktop-data';

export type AdminBrandKind = 'mobile' | 'desktop';
export type AdminBrandGroup = 'popular' | 'more' | 'system' | 'desktop';

// title 为英文站导航名称；label 为中文站导航名称，后台界面以 label 为主展示。
export type AdminBrand = {
  slug: string;
  title: string;
  label: string;
  kind: AdminBrandKind;
  group: AdminBrandGroup;
  rank: number;
  source: 'builtin' | 'custom';
};

export const ADMIN_BRAND_GROUPS: ReadonlyArray<{ key: AdminBrandGroup; label: string }> = [
  { key: 'popular', label: '热门品牌' },
  { key: 'more', label: '更多品牌' },
  { key: 'system', label: '系统' },
  { key: 'desktop', label: '桌面' },
];

const SYSTEM_BRANDS = new Set(['android', 'harmonyos']);
const CUSTOM_RANK = 10_000;
const groupOrder = new Map(ADMIN_BRAND_GROUPS.map((group, index) => [group.key, index]));
const navigationRank = new Map<string, number>(PHONE_NAVIGATION_ORDER.map((slug, index) => [slug, index]));

function mobileGroup(slug: string): AdminBrandGroup {
  if (SYSTEM_BRANDS.has(slug)) return 'system';
  return POPULAR_PHONE_TYPES.has(slug) ? 'popular' : 'more';
}

export function buildBuiltinAdminBrands(): AdminBrand[] {
  const zhPhoneLabels = new Map(getTabData('zh').map((tab) => [normalizeCategoryType(tab.type), tab.title]));
  const zhDesktopLabels = new Map(getDesktopTabData('zh').map((tab) => [tab.type, tab.title]));
  const mobile = BRAND_CATEGORIES.map((brand, index): AdminBrand => ({
    slug: brand.slug,
    title: brand.title,
    label: zhPhoneLabels.get(brand.slug) || brand.title,
    kind: 'mobile',
    group: mobileGroup(brand.slug),
    // 与前台导航一致：未登记顺序的品牌按配置顺序排在末尾。
    rank: navigationRank.get(brand.slug) ?? PHONE_NAVIGATION_ORDER.length + index,
    source: 'builtin',
  }));
  const desktop = getDesktopTabData('en').filter((tab) => !tab.link?.trim()).map((tab, index): AdminBrand => ({
    slug: tab.type,
    title: tab.title,
    label: zhDesktopLabels.get(tab.type) || tab.title,
    kind: 'desktop',
    group: 'desktop',
    rank: index,
    source: 'builtin',
  }));
  return [...mobile, ...desktop];
}

export function describeCustomAdminBrand(brand: { slug: string; title: string; kind: AdminBrandKind }): AdminBrand {
  return {
    slug: brand.slug,
    title: brand.title,
    label: brand.title,
    kind: brand.kind,
    group: brand.kind === 'desktop' ? 'desktop' : 'more',
    rank: CUSTOM_RANK,
    source: 'custom',
  };
}

export function sortAdminBrands(brands: AdminBrand[]): AdminBrand[] {
  return [...brands].sort((left, right) =>
    (groupOrder.get(left.group) ?? 0) - (groupOrder.get(right.group) ?? 0)
    || left.rank - right.rank
    || left.title.localeCompare(right.title, 'en', { sensitivity: 'base' }));
}

// 中文名已包含英文名（如“传音 Infinix”）或两者相同时，不再重复展示英文名。
export function adminBrandSecondaryName(brand: Pick<AdminBrand, 'title' | 'label'>): string {
  return brand.label.toLowerCase().includes(brand.title.toLowerCase()) ? '' : brand.title;
}

export function adminBrandOptionText(brand: Pick<AdminBrand, 'title' | 'label'>): string {
  const secondary = adminBrandSecondaryName(brand);
  return secondary ? `${brand.label} · ${secondary}` : brand.label;
}

export function matchesAdminBrand(brand: Pick<AdminBrand, 'slug' | 'title' | 'label'>, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [brand.label, brand.title, brand.slug].some((value) => value.toLowerCase().includes(needle))
    || brand.slug.replace(/-/g, ' ').includes(needle);
}
