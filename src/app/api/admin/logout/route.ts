import { NextRequest, NextResponse } from 'next/server';
import { clearAdminCookie, requireAdmin } from '@/lib/admin-auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request, true);
  if (denied) return denied;
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  clearAdminCookie(response);
  return response;
}
