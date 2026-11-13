import { getOptionalRequestContext } from '@cloudflare/next-on-pages';
import { normalizeClientIp } from '@/lib/client-ip';

export function downloadDatabase(): D1Database {
  const db = (getOptionalRequestContext()?.env as { DB?: D1Database } | undefined)?.DB;
  if (!db) throw new Error('Download quota unavailable');
  return db;
}

export function downloadDay(now = Date.now()) {
  return new Date(now + 8 * 3600000).toISOString().slice(0, 10);
}

export function downloadRetryAfter(now = Date.now()) {
  return Math.max(1, Math.ceil((Date.parse(`${downloadDay(now)}T00:00:00+08:00`) + 86400000 - now) / 1000));
}

function clientIp(request: Request) {
  // Cloudflare overwrites this header. Never fall back to user-controlled forwarded headers.
  const ip = normalizeClientIp(request.headers.get('cf-connecting-ip'));
  if (!ip) throw new Error('Client IP unavailable');
  return ip;
}

export async function getDownloadQuota(request: Request) {
  const result = await downloadDatabase().prepare(`SELECT s.daily_limit,
    COALESCE(u.downloads, 0) AS downloads FROM w_download_settings s
    LEFT JOIN w_download_daily_usage u ON u.day = ? AND u.ip = ? WHERE s.id = 1`)
    .bind(downloadDay(), clientIp(request)).first<{ daily_limit: number | null; downloads: number }>();
  if (!result) throw new Error('Download settings unavailable');
  return { limit: result.daily_limit, used: result.downloads,
    allowed: result.daily_limit === null || result.downloads < result.daily_limit };
}

// The setting is read inside the write: concurrent requests cannot overspend the quota.
export const CONSUME_DOWNLOAD_SQL = `INSERT INTO w_download_daily_usage (day, ip, downloads)
SELECT ?, ?, 1 FROM w_download_settings WHERE id = 1 AND (daily_limit IS NULL OR daily_limit > 0)
ON CONFLICT(day, ip) DO UPDATE SET downloads = downloads + 1
WHERE (SELECT daily_limit FROM w_download_settings WHERE id = 1) IS NULL
   OR downloads < (SELECT daily_limit FROM w_download_settings WHERE id = 1)
RETURNING downloads`;

export async function consumeDownloadQuota(request: Request): Promise<boolean> {
  const db = downloadDatabase();
  const result = await db.prepare(CONSUME_DOWNLOAD_SQL).bind(downloadDay(), clientIp(request)).all();
  if (!result.success) throw new Error('Download quota unavailable');
  // Cleanup is best-effort; its failure must not charge a download without delivering it.
  if (Math.random() < 0.01) {
    try {
      await db.prepare('DELETE FROM w_download_daily_usage WHERE day < ?')
        .bind(downloadDay(Date.now() - 7 * 86400000)).run();
    } catch { console.error('Download quota cleanup unavailable'); }
  }
  return result.results.length > 0;
}
