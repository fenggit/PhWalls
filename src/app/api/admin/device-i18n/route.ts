import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { deleteAdminDeviceI18n, listAdminDeviceI18n, listAdminDeviceI18nDirectory, saveAdminDeviceI18n } from '@/lib/admin-device-i18n';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    if (!request.nextUrl.searchParams.has('device_id')) {
      const { rows, ...meta } = await listAdminDeviceI18nDirectory(request.nextUrl.searchParams);
      return NextResponse.json({ data: rows, meta }, { headers: { 'Cache-Control': 'no-store' } });
    }
    const data = await listAdminDeviceI18n(request.nextUrl.searchParams.get('device_id'), request.nextUrl.searchParams.get('media'));
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return failure(error);
  }
}

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : '多语言内容操作失败' },
    { status: 400, headers: { 'Cache-Control': 'no-store' } });
}

async function write(request: NextRequest, remove: boolean) {
  const denied = await requireAdmin(request, true);
  if (denied) return denied;
  try {
    const input: unknown = await request.json();
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('请求参数无效');
    if (remove) {
      return NextResponse.json(await deleteAdminDeviceI18n(input as Record<string, unknown>),
        { headers: { 'Cache-Control': 'no-store' } });
    }
    const data = await saveAdminDeviceI18n(input as Record<string, unknown>);
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return failure(error);
  }
}

export const POST = (request: NextRequest) => write(request, false);
export const DELETE = (request: NextRequest) => write(request, true);
