import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { listAdminR2Directories } from '@/lib/admin-r2-directories';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const data = await listAdminR2Directories(request.nextUrl.searchParams.get('prefix') || '',
      request.nextUrl.searchParams.get('cursor') ?? undefined);
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '目录加载失败' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}
