import { getOptionalRequestContext } from '@cloudflare/next-on-pages';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { apiMonitoringEnabled, type ApiMonitorEnv } from '@/lib/api-monitor';
import { ApiMonitorPaginationError, loadApiMonitorClients, loadApiMonitorDetails, loadApiMonitorReport } from '@/lib/api-monitor-report';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) {
    denied.headers.set('Cache-Control', 'private, no-store');
    return denied;
  }
  const range = request.nextUrl.searchParams.get('range') || '24h';
  if (!['1h', '24h', '7d'].includes(range)) {
    return NextResponse.json({ error: 'INVALID_RANGE' }, { status: 400, headers });
  }
  const view = request.nextUrl.searchParams.get('view');
  if (view && view !== 'clients' && view !== 'details') return NextResponse.json({ error: 'INVALID_VIEW' }, { status: 400, headers });
  const kind = request.nextUrl.searchParams.get('kind');
  if (view === 'details' && kind !== 'errors' && kind !== 'external' && kind !== 'anomalous') {
    return NextResponse.json({ error: 'INVALID_DETAIL_KIND' }, { status: 400, headers });
  }
  try {
    const env = getOptionalRequestContext()?.env as ApiMonitorEnv | undefined;
    if (!env?.DB) throw new Error('Unavailable');
    if (view === 'details' && (kind === 'errors' || kind === 'external' || kind === 'anomalous')) {
      const page = Number(request.nextUrl.searchParams.get('page') || '1');
      const until = Number(request.nextUrl.searchParams.get('until'));
      return NextResponse.json({ data: await loadApiMonitorDetails(env.DB, range, until, kind, page) }, { headers });
    }
    if (view === 'clients') {
      const page = Number(request.nextUrl.searchParams.get('page') || '1');
      const until = Number(request.nextUrl.searchParams.get('until'));
      return NextResponse.json({ data: await loadApiMonitorClients(env.DB, range, until, page) }, { headers });
    }
    const data = await loadApiMonitorReport(env.DB, range);
    return NextResponse.json({ data, enabled: apiMonitoringEnabled(env),
      miniAppId: env.API_MONITOR_MINI_APP_ID || process.env.API_MONITOR_MINI_APP_ID || null }, { headers });
  } catch (error) {
    if (error instanceof ApiMonitorPaginationError) {
      return NextResponse.json({ error: error.code }, { status: 400, headers });
    }
    return NextResponse.json({ error: 'MONITOR_UNAVAILABLE' }, { status: 503, headers });
  }
}
