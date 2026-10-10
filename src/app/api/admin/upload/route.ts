import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { assertText, createAdminWallpaper } from '@/lib/admin-data';
import { getWallpaperDb, type DeviceRow } from '@/lib/wallpaper-db';
import { createR2UploadUrl, createUploadGrant, headR2Object, verifyUploadGrant } from '@/lib/r2-upload';
import { assertAdminUploadMime, deviceR2Prefix, normalizeAdminUploadFileName } from '@/lib/admin-upload-path';
import { getAdminUploadStorage, resolveAdminUploadStorage } from '@/lib/admin-upload-storage';
import { parseWallpaperMedia } from '@/lib/wallpaper-media';
import { getI18nTexts } from '@/lib/i18n';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const deviceId = assertText(request.nextUrl.searchParams.get('device_id'), '设备 ID', 80);
    const media = parseWallpaperMedia(request.nextUrl.searchParams.get('media_type'));
    const device = await getWallpaperDb().prepare('SELECT * FROM w_devices WHERE id = ?').bind(deviceId).first<DeviceRow>();
    if (!device) throw new Error('设备不存在');
    const { prefix, directories, source } = await getAdminUploadStorage(device, media);
    const data = { prefix, directories, source };
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '目录加载失败' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
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
    const base = deviceR2Prefix(device);

    if (action === 'authorize') {
      const role = input.role;
      if (role !== 'origin' && role !== 'compress') throw new Error('文件角色无效');
      const mime = assertText(input.mime_type, '文件类型', 100);
      const media = parseWallpaperMedia(input.media_type);
      const size = Number(input.size_bytes);
      const video = mime.startsWith('video/');
      assertAdminUploadMime(mime, role, media);
      const fileName = normalizeAdminUploadFileName(input.file_name, mime);
      if (!Number.isSafeInteger(size) || size < 1 || size > (video ? 200 : 50) * 1024 * 1024) {
        throw new Error('文件大小超出限制');
      }
      const target = await resolveAdminUploadStorage(device, media, input);
      const key = `${target}/${role}/${fileName}`;
      if (key.length > 500) throw new Error(getI18nTexts('zh').adminUploadFileNameInvalid);
      if (await headR2Object(key)) throw new Error(getI18nTexts('zh').adminUploadFileExists.replace('{name}', fileName));
      return NextResponse.json({ key, url: await createR2UploadUrl(key, mime, true), headers: { 'If-None-Match': '*' },
        token: await createUploadGrant(key, size, mime, { deviceId, role, prefix: target }) }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'complete') {
      const origin = await verifyUploadGrant(assertText(input.origin_token, '原图授权', 6000));
      const preview = await verifyUploadGrant(assertText(input.preview_token, '预览授权', 6000));
      const media = origin.mimeType.startsWith('video/') ? 'dynamic' : 'static';
      if (input.media_type !== undefined && parseWallpaperMedia(input.media_type) !== media) throw new Error('上传文件与所选壁纸类型不匹配');
      assertAdminUploadMime(origin.mimeType, 'origin', media);
      assertAdminUploadMime(preview.mimeType, 'compress', media);
      const originBase = origin.prefix ?? base;
      const previewBase = preview.prefix ?? base;
      if (originBase !== previewBase || (origin.deviceId !== undefined && origin.deviceId !== deviceId) ||
          (preview.deviceId !== undefined && preview.deviceId !== deviceId) ||
          (origin.role !== undefined && origin.role !== 'origin') || (preview.role !== undefined && preview.role !== 'compress') ||
          !origin.key.startsWith(`${originBase}/origin/`) || !preview.key.startsWith(`${previewBase}/compress/`)) {
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
        media_type: media,
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
