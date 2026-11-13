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
  const day = downloadDay(), ip = clientIp(request);
  const result = await downloadDatabase().prepare(`SELECT s.daily_limit,
    COALESCE(u.downloads, 0) AS downloads,
    (SELECT COUNT(*) FROM w_download_reservations WHERE day = ? AND ip = ?) AS reserved
    FROM w_download_settings s
    LEFT JOIN w_download_daily_usage u ON u.day = ? AND u.ip = ? WHERE s.id = 1`)
    .bind(day, ip, day, ip).first<{ daily_limit: number | null; downloads: number; reserved: number }>();
  if (!result) throw new Error('Download settings unavailable');
  return { limit: result.daily_limit, used: result.downloads, reserved: result.reserved,
    allowed: result.daily_limit === null || result.downloads + result.reserved < result.daily_limit };
}

// A single atomic insert accounts for both completed and currently streaming downloads.
export const RESERVE_DOWNLOAD_SQL = `INSERT INTO w_download_reservations (id, day, ip)
SELECT ?, ?, ? FROM w_download_settings s WHERE s.id = 1 AND
(s.daily_limit IS NULL OR
 COALESCE((SELECT downloads FROM w_download_daily_usage WHERE day = ? AND ip = ?), 0)
 + (SELECT COUNT(*) FROM w_download_reservations WHERE day = ? AND ip = ?) < s.daily_limit)
RETURNING id`;

export async function reserveDownloadQuota(request: Request): Promise<string | null> {
  const db = downloadDatabase();
  const day = downloadDay(), ip = clientIp(request), id = crypto.randomUUID();
  const result = await db.prepare(RESERVE_DOWNLOAD_SQL).bind(id, day, ip, day, ip, day, ip).all();
  if (!result.success) throw new Error('Download quota unavailable');
  if (Math.random() < 0.01) {
    try {
      const cutoff = downloadDay(Date.now() - 7 * 86400000);
      await db.batch([
        db.prepare('DELETE FROM w_download_daily_usage WHERE day < ?').bind(cutoff),
        db.prepare('DELETE FROM w_download_reservations WHERE day < ?').bind(cutoff),
      ]);
    } catch { console.error('Download quota cleanup unavailable'); }
  }
  return result.results.length ? id : null;
}

export const COMPLETE_DOWNLOAD_SQL = `INSERT INTO w_download_daily_usage (day, ip, downloads)
SELECT day, ip, 1 FROM w_download_reservations WHERE id = ?
ON CONFLICT(day, ip) DO UPDATE SET downloads = downloads + 1`;

// D1 batch is transactional. Deleting the reservation makes completion retry-safe.
export async function settleDownloadQuota(id: string, success: boolean): Promise<void> {
  const db = downloadDatabase();
  for (let attempt = 0; ; attempt++) {
    try {
      const statements = success ? [db.prepare(COMPLETE_DOWNLOAD_SQL).bind(id)] : [];
      statements.push(db.prepare('DELETE FROM w_download_reservations WHERE id = ?').bind(id));
      const results = await db.batch(statements);
      if (results.some((result) => !result.success)) throw new Error('Download quota unavailable');
      return;
    } catch (error) { if (attempt === 2) throw error; }
  }
}
