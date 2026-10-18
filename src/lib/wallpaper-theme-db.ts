import 'server-only';
import { getWallpaperDb, toWallpaperAsset, type WallpaperRow } from '@/lib/wallpaper-db';
import { withWallpaperQueryCache } from '@/lib/wallpaper-query-cache';
import { matchesTheme, type WallpaperTheme } from '@/lib/wallpaper-themes';
import { THEME_SELECTIONS } from '@/lib/theme-selections';
import { collectionDetailPath } from '@/lib/wallpaper-discovery';
import { isWallpaperCategory, type WallpaperAsset } from '@/lib/wallpaper-data';
import { isDesktopWallpaperCategory } from '@/lib/desktop-data';
import type { Language } from '@/types';
import { WALLPAPER_THEMES } from '@/lib/wallpaper-themes';
import { buildPublicR2Url } from '@/lib/r2-public-url';

export type ThemeWallpaper = WallpaperAsset & {
  id: string; collectionId: string; sourceName: string; sourcePath: string; brand: string; updatedAt: number;
};

export type ThemeCard = {
  slug: string; count: number; coverUrl: string; coverPosition: 'center' | 'top';
};

// Choose representative artwork rather than the first file in a collection.
// IDs still pass through the same live publication and tag checks as the gallery.
const THEME_COVERS: Record<string, string> = {
  dark: '00967531228fa313ba33d0118082a007',
  technology: '473f0f63206b137aaa1bbd8e68d71b65',
  illustration: '67226aefeb83816e74ea43e1317ff52e',
};

export async function loadThemeCards(language: Language, themes: readonly WallpaperTheme[] = WALLPAPER_THEMES): Promise<ThemeCard[]> {
  const cards = await Promise.all(themes.map(async theme => {
    const items = await loadThemeWallpapers(theme, language);
    const cover = items.find(item => item.id === THEME_COVERS[theme.slug]) || items[0];
    const coverUrl = cover && buildPublicR2Url(cover.compressPath);
    if (!cover || !coverUrl) return null;
    return { slug: theme.slug, count: items.length, coverUrl,
      coverPosition: cover.height! > cover.width! * 1.4 ? 'top' as const : 'center' as const };
  }));
  return cards.filter((card): card is ThemeCard => card !== null);
}

export async function loadThemeWallpapers(theme: WallpaperTheme, language: Language = 'en'): Promise<ThemeWallpaper[]> {
  const ids = THEME_SELECTIONS[theme.slug] || [];
  if (!ids.length) return [];
  return withWallpaperQueryCache(['theme-selection-i18n-v3', theme.slug, language, ids], async () => {
    const { results } = await getWallpaperDb().prepare(`
      SELECT w.*, d.brand_name, d.device_name, d.device_slug,
        COALESCE(i.display_name,e.display_name,d.device_name) AS source_name,
        MAX(w.updated_date,d.updated_date,COALESCE(i.updated_date,0),COALESCE(e.updated_date,0)) AS changed_at
      FROM w_wallpapers w JOIN w_devices d ON d.id=w.device_id
      LEFT JOIN w_device_i18n i ON i.device_id=d.id AND i.language=?
      LEFT JOIN w_device_i18n e ON e.device_id=d.id AND e.language='en'
      WHERE w.id IN (SELECT value FROM json_each(?))
        AND w.media_type='static' AND w.status='published' AND w.deletion_state='none'
        AND d.status='published' AND d.deletion_state='none'
        AND w.compress_key IS NOT NULL AND w.width>0 AND w.height>0
        AND NOT EXISTS (SELECT 1 FROM w_collection_deletions c WHERE c.device_id=d.id AND c.media_type='static')
    `).bind(language, JSON.stringify(ids)).all<WallpaperRow & {
      brand_name: string; device_name: string; device_slug: string; source_name: string; changed_at: number;
    }>();
    const byId = new Map(results.map(row => [row.id, row]));
    const keys = new Set<string>();
    const cover = THEME_COVERS[theme.slug];
    const orderedIds = ids.includes(cover) ? [cover, ...ids.filter(id => id !== cover)] : ids;
    return orderedIds.flatMap(id => {
      const row = byId.get(id);
      if (!row || keys.has(row.origin_key) || (!isWallpaperCategory(row.brand_name) && !isDesktopWallpaperCategory(row.brand_name))) return [];
      const asset = toWallpaperAsset(row);
      if (!matchesTheme(theme, asset)) return [];
      keys.add(row.origin_key);
      return [{ ...asset, id: row.id, collectionId: row.device_id, sourceName: row.source_name, brand: row.brand_name,
        sourcePath: collectionDetailPath(row.brand_name, row.device_slug), updatedAt: row.changed_at }];
    });
  });
}
