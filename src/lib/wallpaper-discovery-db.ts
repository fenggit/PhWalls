import 'server-only';
import { getWallpaperDb } from '@/lib/wallpaper-db';
import { withWallpaperQueryCache } from '@/lib/wallpaper-query-cache';
import type { WallpaperCollection } from '@/lib/wallpaper-data';
import type { Language } from '@/types';
import { rankRelatedCollections, type RelatedCollection } from '@/lib/wallpaper-discovery';

export async function loadRelatedCollections(brand: string, current: WallpaperCollection, language: Language) {
  const media = current.mediaType || 'static';
  const candidates = await withWallpaperQueryCache(['related-v1', brand, media, language], async () => {
    const table = media === 'dynamic' ? 'w_live_device_i18n' : 'w_device_i18n';
    const { results } = await getWallpaperDb().prepare(`
      WITH summaries AS (
        SELECT w.device_id, COUNT(*) AS count,
          GROUP_CONCAT(DISTINCT CASE WHEN w.width>0 AND w.height>0 THEN w.width || 'x' || w.height END) AS sizes
        FROM w_devices d JOIN w_wallpapers w ON w.device_id=d.id
        WHERE d.brand_name=? AND d.status='published' AND d.deletion_state='none'
          AND w.status='published' AND w.deletion_state='none' AND w.media_type=?
          AND NOT EXISTS (SELECT 1 FROM w_collection_deletions c WHERE c.device_id=d.id AND c.media_type=w.media_type)
        GROUP BY w.device_id
      )
      SELECT d.id AS deviceId, d.device_name AS deviceName, d.device_category AS deviceCategory,
        COALESCE(l.display_name,e.display_name,d.device_name) AS name, d.device_slug AS slug,
        d.release_date AS date, s.count, s.sizes
      FROM summaries s JOIN w_devices d ON d.id=s.device_id
      LEFT JOIN ${table} l ON l.device_id=d.id AND l.language=?
      LEFT JOIN ${table} e ON e.device_id=d.id AND e.language='en'
      ORDER BY d.device_slug
    `).bind(brand, media, language).all<Omit<RelatedCollection, 'resolutions'> & { sizes: string | null }>();
    return results.map(({ sizes, ...row }) => ({ ...row, resolutions: sizes?.split(',') || [] }));
  });
  return rankRelatedCollections({ ...current, resolutions: current.item.filter(item => item.width && item.height)
    .map(item => `${item.width}x${item.height}`) }, candidates);
}
