import type { WallpaperCollection } from '@/lib/wallpaper-data';
import { buildDesktopWallpaperDetailPath, isDesktopWallpaperCategory } from '@/lib/desktop-data';
import { buildWallpaperDetailPath } from '@/lib/wallpaper-data';
import { parseWallpaperDate } from '@/lib/wallpaper-data';
import { buildLiveWallpaperDetailPath } from '@/lib/live-data';

export type RelatedCollection = {
  deviceId: string; deviceName: string; deviceCategory: string; name: string;
  slug: string; count: number; resolutions: string[]; date: string;
};

// Match known model families on the canonical device name, not on translated SEO titles.
export function deviceSeries(name: string): string | null {
  const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const family = normalized.match(/\b(galaxy (?:tab [as]|z fold|z flip|[asfm])|pixel(?: fold)?|redmi note|redmi|poco [fmxc]|find [xn]|reno|mate(?:pad|book)?|nova|honor magic|xperia|iphone|ipad(?: pro| air| mini)?|surface(?: pro| laptop| book)?|thinkpad)\s*\d*/);
  if (family) return family[1];
  const numbered = normalized.match(/^(.*?)[0-9]/)?.[1]?.trim();
  return numbered && numbered.length > 2 ? numbered : null;
}

export function rankRelatedCollections(
  current: { deviceId?: string; deviceName?: string; deviceCategory?: string; resolutions: string[] },
  candidates: RelatedCollection[], limit = 6
): RelatedCollection[] {
  const series = deviceSeries(current.deviceName || '');
  const score = (row: RelatedCollection) => (series && deviceSeries(row.deviceName) === series ? 100 : 0)
    + (row.resolutions.some(size => current.resolutions.includes(size)) ? 20 : 0);
  const byDateDesc = (a: RelatedCollection, b: RelatedCollection) =>
    (parseWallpaperDate(b.date)?.getTime() || 0) - (parseWallpaperDate(a.date)?.getTime() || 0)
    || a.slug.localeCompare(b.slug);
  const pool = candidates.filter(row => row.count > 0
    && (!current.deviceCategory || row.deviceCategory === current.deviceCategory));
  const max = Math.max(0, Math.min(limit, 8));
  // 按发布时间排列的前后相邻机型固定入选：时间线上每个合集都至少获得一条入链，老机型不会因排序沦为孤儿页。
  const timeline = [...pool].sort(byDateDesc);
  const position = timeline.findIndex(row => row.deviceId === current.deviceId);
  const neighbors = position < 0 ? [] : [timeline[position + 1], timeline[position - 1]]
    .filter((row): row is RelatedCollection => Boolean(row));
  const ranked = pool.filter(row => row.deviceId !== current.deviceId)
    .sort((a, b) => score(b) - score(a) || byDateDesc(a, b));
  // 邻居保证入选，展示顺序仍按系列与尺寸评分排列。
  const picked = new Set<string>();
  for (const row of [...neighbors, ...ranked]) {
    if (picked.size >= max) break;
    picked.add(row.deviceId);
  }
  return ranked.filter(row => picked.has(row.deviceId));
}

export function collectionDetailPath(category: string, slug: string, media: WallpaperCollection['mediaType'] = 'static') {
  if (isDesktopWallpaperCategory(category)) return buildDesktopWallpaperDetailPath(category, slug, media);
  return media === 'dynamic' ? buildLiveWallpaperDetailPath(category, slug) : buildWallpaperDetailPath(category, slug);
}
