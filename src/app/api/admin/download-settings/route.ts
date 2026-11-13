import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { downloadDatabase } from '@/lib/download-quota';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) { denied.headers.set('Cache-Control', headers['Cache-Control']); return denied; }
  try {
    const row = await downloadDatabase().prepare('SELECT daily_limit FROM w_download_settings WHERE id = 1').first();
    if (!row) throw new Error('Missing settings');
    return NextResponse.json(row, { headers });
  } catch { return NextResponse.json({ error: 'DOWNLOAD_SETTINGS_UNAVAILABLE' }, { status: 503, headers }); }
}
export async function PUT(request: NextRequest) {
  const denied = await requireAdmin(request, true);
  if (denied) { denied.headers.set('Cache-Control', headers['Cache-Control']); return denied; }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_LIMIT' }, { status: 400, headers }); }
  const limit = input && typeof input === 'object' && 'daily_limit' in input ? input.daily_limit : undefined;
  if (limit !== null && (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < 0 || limit > 1000000)) {
    return NextResponse.json({ error: 'INVALID_LIMIT' }, { status: 400, headers });
  }
  try {
    const row = await downloadDatabase().prepare('UPDATE w_download_settings SET daily_limit = ? WHERE id = 1 RETURNING daily_limit').bind(limit).first();
    if (!row) throw new Error('Missing settings');
    return NextResponse.json(row, { headers });
  } catch { return NextResponse.json({ error: 'DOWNLOAD_SETTINGS_UNAVAILABLE' }, { status: 503, headers }); }
}
