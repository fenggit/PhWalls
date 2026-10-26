import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { assertText, createAdminWallpaper } from '@/lib/admin-data';
import { getWallpaperDb, type DeviceRow } from '@/lib/wallpaper-db';
import { createR2UploadUrl, createUploadGrant, headR2Object, verifyUploadGrant } from '@/lib/r2-upload';
import { assertAdminUploadMime, normalizeAdminR2Prefix, normalizeAdminUploadFileName } from '@/lib/admin-upload-path';
import { getAdminUploadStorage, resolveAdminUploadStorage } from '@/lib/admin-upload-storage';
import { parseWallpaperMedia } from '@/lib/wallpaper-media';
import { getI18nTexts } from '@/lib/i18n';
import { verifyAdminUploadContent } from '@/lib/admin-upload-content';
import { assertAdminUploadPrefixOwnership } from '@/lib/admin-upload-storage';
import { readR2OriginMetadata } from '@/lib/admin-origin-metadata';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  try {
    const deviceId = assertText(request.nextUrl.searchParams.get('device_id'), '设备 ID', 80);
    const media = parseWallpaperMedia(request.nextUrl.searchParams.get('media_type'));
    const device = await getWallpaperDb().prepare('SELECT * FROM w_devices WHERE id = ?').bind(deviceId).first<DeviceRow>();
    if (!device) throw new Error('设备不存在');
    if (device.deletion_state !== 'none') throw new Error(getI18nTexts('zh').adminDeviceDeletionPending);
    const data = await getAdminUploadStorage(device, media);
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
    if (device.deletion_state !== 'none') throw new Error(getI18nTexts('zh').adminDeviceDeletionPending);


    if (action === 'reconcile') {
      const grant = await verifyUploadGrant(assertText(input.upload_token, '上传授权', 6000));
      if (grant.deviceId !== deviceId || !grant.groupId ||
          (grant.media !== 'static' && grant.media !== 'dynamic') ||
          (grant.role !== 'origin' && grant.role !== 'compress' && grant.role !== 'preview') ||
          !grant.prefix || normalizeAdminR2Prefix(grant.prefix) !== grant.prefix ||
          !grant.key.startsWith(`${grant.prefix}/${grant.role}/`)) {
        throw new Error('文件与设备、素材组或授权角色不匹配');
      }
      assertText(grant.groupId, '素材组 ID', 80);
      assertAdminUploadMime(grant.mimeType, grant.role, grant.media);
      normalizeAdminUploadFileName(grant.key.slice(`${grant.prefix}/${grant.role}/`.length), grant.mimeType);
      await assertCollectionAvailable(deviceId, grant.media);
      await assertAdminUploadPrefixOwnership(deviceId, grant.prefix);
      if (await getWallpaperDb().prepare('SELECT 1 FROM w_deleted_wallpaper_files WHERE object_key = ?').bind(grant.key).first()) {
        throw new Error('该文件名已删除并受保护，请使用新的文件名');
      }
      const info = await headR2Object(grant.key);
      if (!info) return NextResponse.json({ data: { uploaded: false } }, { headers: { 'Cache-Control': 'no-store' } });
      if (info.size !== grant.size || info.mimeType !== grant.mimeType) throw new Error('R2 文件与授权信息不一致');
      await verifyAdminUploadContent(grant.key, info);
      return NextResponse.json({ data: { uploaded: true } }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'authorize') {
      const groupId = assertText(input.group_id, '素材组 ID', 80);
      const role = input.role;
      if (role !== 'origin' && role !== 'compress' && role !== 'preview') throw new Error('文件角色无效');
      const mime = assertText(input.mime_type, '文件类型', 100);
      const media = parseWallpaperMedia(input.media_type);
      await assertCollectionAvailable(deviceId, media);
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
      if (await getWallpaperDb().prepare('SELECT 1 FROM w_deleted_wallpaper_files WHERE object_key = ?').bind(key).first()) throw new Error('该文件名已删除并受保护，请使用新的文件名');
      if (await headR2Object(key)) throw new Error(getI18nTexts('zh').adminUploadFileExists.replace('{name}', fileName));
      return NextResponse.json({ key, url: await createR2UploadUrl(key, mime, true), headers: { 'If-None-Match': '*' },
        token: await createUploadGrant(key, size, mime, { deviceId, role, prefix: target, groupId, media }) }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action === 'complete') {
      const origin = await verifyUploadGrant(assertText(input.origin_token, '原图授权', 6000));
      const preview = await verifyUploadGrant(assertText(input.preview_token, '预览授权', 6000));
      const videoPreview = input.video_preview_token === undefined ? undefined
        : await verifyUploadGrant(assertText(input.video_preview_token, '视频预览授权', 6000));
      const media = origin.mimeType.startsWith('video/') ? 'dynamic' : 'static';
      await assertCollectionAvailable(deviceId, media);
      if (input.media_type !== undefined && parseWallpaperMedia(input.media_type) !== media) throw new Error('上传文件与所选壁纸类型不匹配');
      assertAdminUploadMime(origin.mimeType, 'origin', media);
      assertAdminUploadMime(preview.mimeType, 'compress', media);
      if (videoPreview) assertAdminUploadMime(videoPreview.mimeType, 'preview', media);
      const originBase = origin.prefix;
      if (!originBase || !origin.groupId || origin.media !== media ||
          [origin, preview, ...(videoPreview ? [videoPreview] : [])].some(grant =>
            grant.deviceId !== deviceId || grant.prefix !== originBase || grant.groupId !== origin.groupId || grant.media !== media) ||
          origin.role !== 'origin' || preview.role !== 'compress' ||
          !origin.key.startsWith(`${originBase}/origin/`) || !preview.key.startsWith(`${originBase}/compress/`)) {
        throw new Error('文件与设备、素材组或授权角色不匹配');
      }
      for (const grant of [origin, preview, ...(videoPreview ? [videoPreview] : [])]) {
        const filename = grant.key.slice(`${originBase}/${grant.role}/`.length);
        normalizeAdminUploadFileName(filename, grant.mimeType);
      }
      await assertAdminUploadPrefixOwnership(deviceId, originBase);
      if (videoPreview && (videoPreview.role !== 'preview' || videoPreview.key !== origin.key.replace('/origin/', '/preview/'))) {
        throw new Error(getI18nTexts('zh').adminUploadVideoPreviewNameMismatch);
      }
      const [originInfo, previewInfo, videoPreviewInfo] = await Promise.all([
        headR2Object(origin.key), headR2Object(preview.key), videoPreview ? headR2Object(videoPreview.key) : undefined,
      ]);
      if (!originInfo || !previewInfo || originInfo.size !== origin.size || previewInfo.size !== preview.size ||
          originInfo.mimeType !== origin.mimeType || previewInfo.mimeType !== preview.mimeType) {
        throw new Error('R2 文件未上传完成或与授权信息不一致');
      }
      if (videoPreview && (!videoPreviewInfo || videoPreviewInfo.size !== videoPreview.size || videoPreviewInfo.mimeType !== videoPreview.mimeType)) {
        throw new Error('R2 视频预览未上传完成或与授权信息不一致');
      }
      await Promise.all([verifyAdminUploadContent(origin.key, originInfo), verifyAdminUploadContent(preview.key, previewInfo),
        ...(videoPreview && videoPreviewInfo ? [verifyAdminUploadContent(videoPreview.key, videoPreviewInfo)] : [])]);
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([deviceId, origin.groupId, originBase, media])));
      const uploadId = 'upload-' + Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
      const metadata = await readR2OriginMetadata(origin.key, originInfo);
      const data = await createAdminWallpaper({
        device_id: deviceId,
        name: input.name,
        origin_key: origin.key,
        compress_key: preview.key,
        mime_type: origin.mimeType,
        size_bytes: metadata.size,
        width: metadata.width,
        height: metadata.height,
        media_type: media,
        category: input.category || device.device_category,
        theme: input.theme || 'normal',
        tags: input.tags || [],
      }, uploadId);
      return NextResponse.json({ data }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }
    throw new Error('操作无效');
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : '上传失败' }, { status: 400 });
  }
}

async function assertCollectionAvailable(deviceId: string, media: string): Promise<void> {
  const deleting = await getWallpaperDb().prepare('SELECT 1 FROM w_collection_deletions WHERE device_id = ? AND media_type = ?')
    .bind(deviceId, media).first();
  if (deleting) throw new Error(getI18nTexts('zh').adminCollectionDeleteRetryHint);
}
