import { headR2Object, readR2ObjectRange } from '@/lib/r2-upload';
import { readOriginalDimensions } from '@/lib/original-media-metadata';

export async function readR2OriginMetadata(key: string, verifiedInfo?: { size: number; mimeType: string; etag?: string }) {
  const info = verifiedInfo || await headR2Object(key);
  if (!info) throw new Error('R2 原文件不存在');
  const dimensions = await readOriginalDimensions({
    size: info.size,
    read: (start, length) => readR2ObjectRange(key, start, length, info.size, info.etag),
  }, info.mimeType);
  return { ...info, ...dimensions };
}
