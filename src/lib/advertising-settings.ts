import { getOptionalRequestContext } from '@cloudflare/next-on-pages';

/**
 * Advertising remains enabled if D1 is unavailable or has not received the
 * settings migration. A configuration outage must not silently disable ads.
 */
export async function isAdvertisingEnabled(): Promise<boolean> {
  try {
    const database = (getOptionalRequestContext()?.env as { DB?: D1Database } | undefined)?.DB;
    if (!database) return true;
    const setting = await database.prepare('SELECT ads_enabled FROM w_download_settings WHERE id = 1')
      .first<{ ads_enabled: number }>();
    return setting?.ads_enabled !== 0;
  } catch {
    return true;
  }
}
