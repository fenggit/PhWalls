import { getOptionalRequestContext } from '@cloudflare/next-on-pages';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { normalizeClientIp } from '@/lib/client-ip';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
function database() {
  const db = (getOptionalRequestContext()?.env as { DB?: D1Database } | undefined)?.DB;
  if (!db) throw new Error('Unavailable');
  return db;
}
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) { denied.headers.set('Cache-Control', headers['Cache-Control']); return denied; }
  const page = Number(request.nextUrl.searchParams.get('page') || '1');
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    return NextResponse.json({ error: 'INVALID_PAGE' }, { status: 400, headers });
  }
  try {
    const result = await database().prepare('SELECT ip,created_at FROM w_api_ip_blocklist ORDER BY created_at DESC,ip LIMIT 51 OFFSET ?')
      .bind((page - 1) * 50).all();
    if (!result.success) throw new Error('Unavailable');
    return NextResponse.json({ data: result.results.slice(0, 50), hasMore: result.results.length > 50 }, { headers });
  } catch { return NextResponse.json({ error: 'BLOCKLIST_UNAVAILABLE' }, { status: 503, headers }); }
}
async function mutate(request: NextRequest, remove: boolean) {
  const denied = await requireAdmin(request, true);
  if (denied) { denied.headers.set('Cache-Control', headers['Cache-Control']); return denied; }
  let input: unknown;
  try { input = await request.json(); } catch { return NextResponse.json({ error: 'INVALID_IP' }, { status: 400, headers }); }
  const ip = normalizeClientIp(input && typeof input === 'object' && 'ip' in input ? input.ip : null);
  if (!ip) return NextResponse.json({ error: 'INVALID_IP' }, { status: 400, headers });
  try {
    const db = database();
    const result = await (remove ? db.prepare('DELETE FROM w_api_ip_blocklist WHERE ip = ?').bind(ip)
      : db.prepare('INSERT INTO w_api_ip_blocklist(ip,created_at) VALUES(?,?) ON CONFLICT(ip) DO NOTHING').bind(ip, Date.now())).all();
    if (!result.success) throw new Error('Unavailable');
    return NextResponse.json({ ip, blocked: !remove }, { headers });
  } catch { return NextResponse.json({ error: 'BLOCKLIST_UNAVAILABLE' }, { status: 503, headers }); }
}
export function POST(request: NextRequest) { return mutate(request, false); }
export function DELETE(request: NextRequest) { return mutate(request, true); }
