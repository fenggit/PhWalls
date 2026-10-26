import { readR2ObjectRange } from '@/lib/r2-upload';

export function assertAdminUploadContent(bytes: Uint8Array, mime: string): void {
  const ascii = (start: number, end: number) => String.fromCharCode(...Array.from(bytes.slice(start, end)));
  const has = (prefix: number[]) => prefix.every((value, index) => bytes[index] === value);
  let valid = false;
  if (mime === 'image/jpeg') valid = has([255, 216, 255]);
  else if (mime === 'image/png') valid = has([137,80,78,71,13,10,26,10]);
  else if (mime === 'image/gif') valid = ['GIF87a','GIF89a'].includes(ascii(0,6));
  else if (mime === 'image/webp') valid = ascii(0,4) === 'RIFF' && ascii(8,12) === 'WEBP';
  else if (mime === 'image/avif' || mime === 'video/mp4') {
    if (bytes.length >= 16 && ascii(4,8) === 'ftyp') {
      const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0);
      if (length >= 16 && length <= bytes.length && length % 4 === 0) {
        const brands = [ascii(8,12)];
        for (let offset = 16; offset < length; offset += 4) brands.push(ascii(offset,offset+4));
        const avif = brands.some(brand => ['avif','avis'].includes(brand));
        valid = mime === 'image/avif' ? avif : !avif && brands.some(brand => /^(isom|iso[2-9]|mp4[12]|avc1|M4V |MSNV|dash)$/.test(brand));
      }
    }
  }
  if (!valid) throw new Error('文件内容签名与授权格式不一致或不受支持');
}
export async function verifyAdminUploadContent(key: string, info: {size: number; mimeType: string; etag?: string}) {
  const bytes = await readR2ObjectRange(key, 0, Math.min(info.size, 4096), info.size, info.etag);
  assertAdminUploadContent(bytes, info.mimeType);
}
