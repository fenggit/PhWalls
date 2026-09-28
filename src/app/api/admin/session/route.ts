import { NextRequest, NextResponse } from 'next/server';
import { hasAdminSession, isAdminHost } from '@/lib/admin-auth';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  if (!isAdminHost(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ authenticated: await hasAdminSession(request) },
    { headers: { 'Cache-Control': 'no-store' } });
}
