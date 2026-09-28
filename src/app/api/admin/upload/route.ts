import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { assertText, createAdminWallpaper } from '@/lib/admin-data';
import { getWallpaperDb, type DeviceRow } from '@/lib/wallpaper-db';
import { createR2UploadUrl, createUploadGrant, headR2Object, verifyUploadGrant } from '@/lib/r2-upload';

export const runtime = 'edge';

const mimeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/avif': 'avif', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm',
};

function prefix(device: DeviceRow): string {
  return device.device_category === 'desktop'
    ? `desktopwalls/${device.brand_name}/${device.device_slug}`
    : `${device.brand_name}/${device.device_slug}`;
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request, true);
  if (denied) return denied;
  try {
    const input = await request.json() as Record<string, unknown>;
    const action = assertText(input.action, '操作', 20);
    const deviceId = assertText(input.device_id, '设备 ID', 80);
    const device = await getWallpaperDb().prepare('SELECT * FROM w_devices WHERE id = ?').bind(deviceId).first<DeviceRow>();
    if (!device) throw new Error('设备不存在');
    const base = prefix(device);

    if (action === 'authorize') {
      const role = input.role;
      if (role !== 'origin' && role !== 'compress') throw new Error('文件角色无效');
      const mime = assertText(input.mime_type, '文件类型', 100);
      const extension = mimeExtensions[mime];
      const media = input.media_type === 'dynamic' ? 'dynamic' : 'static';
      const size = Number(input.size_bytes);
      const video = mime.startsWith('video/');
      if (!extension || video !== (role === 'origin' && media === 'dynamic')) throw new Error('文件类型与角色不匹配');
      if (!Number.isSafeInteger(size) || size < 1 || size > (video ? 200 : 50) * 1024 * 1024) {
        throw new Error('文件大小超出限制');
      }
      const key = `${base}/${role}/${crypto.randomUUID()}.${extension}`;
      return NextResponse.json({ key, url: await createR2UploadUrl(key, mime),
        token: await createUploadGrant(key, size, mime) }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'complete') {
      const origin = await verifyUploadGrant(assertText(input.origin_token, '原图授权', 2000));
      const preview = await verifyUploadGrant(assertText(input.preview_token, '预览授权', 2000));
      if (!origin.key.startsWith(`${base}/origin/`) || !preview.key.startsWith(`${base}/compress/`)) {
        throw new Error('文件与设备不匹配');
      }
      const [originInfo, previewInfo] = await Promise.all([headR2Object(origin.key), headR2Object(preview.key)]);
      if (!originInfo || !previewInfo || originInfo.size !== origin.size || previewInfo.size !== preview.size ||
          originInfo.mimeType !== origin.mimeType || previewInfo.mimeType !== preview.mimeType) {
        throw new Error('R2 文件未上传完成或与授权信息不一致');
      }
      const data = await createAdminWallpaper({
        device_id: deviceId,
        name: input.name,
        origin_key: origin.key,
        compress_key: preview.key,
        mime_type: origin.mimeType,
        size_bytes: origin.size,
        media_type: origin.mimeType.startsWith('video/') ? 'dynamic' : 'static',
        category: input.category || device.device_category,
        theme: input.theme || 'normal',
        tags: input.tags || [],
      });
      return NextResponse.json({ data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }
    throw new Error('操作无效');
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '上传失败' }, { status: 400 });
  }
}
