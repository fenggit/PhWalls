import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { checkAdminDeviceName, createAdminDevice, listAdminDevices, updateAdminDevice } from '@/lib/admin-data';
import { AdminDeviceNameConflictError } from '@/lib/admin-device-name';
import { getI18nTexts } from '@/lib/i18n';
import { deleteAdminDevice, previewAdminDeviceDeletion, type AdminDeviceDeletionPreview } from '@/lib/admin-device-deletion';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  if (request.nextUrl.searchParams.has('delete_preview')) {
    try {
      const data = await previewAdminDeviceDeletion(request.nextUrl.searchParams.get('delete_preview'), request.nextUrl.searchParams.get('media_type'));
      assertDeletionScope(data);
      return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : '加载失败' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }
  }
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

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin(request, true);
  if (denied) return denied;
  try {
    const input = await request.json() as Record<string, unknown>;
    if (input.media_type === undefined || input.media_type === null) {
      assertDeletionScope(await previewAdminDeviceDeletion(input.id));
    }
    return NextResponse.json(await deleteAdminDevice(input),
      { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '删除失败' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
}

function assertDeletionScope(preview: AdminDeviceDeletionPreview): void {
  if (!preview.media_type && preview.wallpapers.length && preview.device.deletion_state === 'none') {
    throw new Error(getI18nTexts('zh').adminCollectionDeleteScopeRequired);
  }
}
