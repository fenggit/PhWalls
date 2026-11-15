import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { downloadDatabase } from '@/lib/download-quota';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };
type AdSettingsRow = { ads_enabled: number };

function response(row: AdSettingsRow) {
  return NextResponse.json({ ads_enabled: row.ads_enabled !== 0 }, { headers });
}

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) { denied.headers.set('Cache-Control', headers['Cache-Control']); return denied; }
  try {
    const row = await downloadDatabase().prepare('SELECT ads_enabled FROM w_download_settings WHERE id = 1').first<AdSettingsRow>();
    if (!row) throw new Error('Missing settings');
    return response(row);
  } catch {
    return NextResponse.json({ error: 'AD_SETTINGS_UNAVAILABLE' }, { status: 503, headers });
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request, true);
  if (denied) { denied.headers.set('Cache-Control', headers['Cache-Control']); return denied; }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_ADS_ENABLED' }, { status: 400, headers }); }
  const enabled = input && typeof input === 'object' && 'ads_enabled' in input ? input.ads_enabled : undefined;
  if (typeof enabled !== 'boolean') return NextResponse.json({ error: 'INVALID_ADS_ENABLED' }, { status: 400, headers });
  try {
    const row = await downloadDatabase().prepare('UPDATE w_download_settings SET ads_enabled = ? WHERE id = 1 RETURNING ads_enabled')
      .bind(enabled ? 1 : 0).first<AdSettingsRow>();
    if (!row) throw new Error('Missing settings');
    return response(row);
  } catch {
    return NextResponse.json({ error: 'AD_SETTINGS_UNAVAILABLE' }, { status: 503, headers });
  }
}
