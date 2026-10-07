import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { checkAdminDeviceName, createAdminDevice, listAdminDevices, updateAdminDevice } from '@/lib/admin-data';
import { AdminDeviceNameConflictError } from '@/lib/admin-device-name';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (request.nextUrl.searchParams.has('check_name')) {
    try {
      const data = await checkAdminDeviceName(request.nextUrl.searchParams.get('brand'), request.nextUrl.searchParams.get('check_name'));
      return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : '检查失败' }, { status: 400 });
    }
  }
  return NextResponse.json({ data: await listAdminDevices(request.nextUrl.searchParams) },
    { headers: { 'Cache-Control': 'no-store' } });
}

async function save(request: NextRequest, create: boolean) {
  const denied = await requireAdmin(request, true);
  if (denied) return denied;
  try {
    const input = await request.json() as Record<string, unknown>;
    const data = create ? await createAdminDevice(input) : await updateAdminDevice(input);
    return NextResponse.json({ data }, { status: create ? 201 : 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AdminDeviceNameConflictError) {
      return NextResponse.json({ error: error.message, conflict: error.conflict },
        { status: 409, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : '操作失败' }, { status: 400 });
  }
}

export const POST = (request: NextRequest) => save(request, true);
export const PATCH = (request: NextRequest) => save(request, false);
