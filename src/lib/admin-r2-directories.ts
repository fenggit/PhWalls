import { listR2DirectoryPage } from '@/lib/r2-upload';
import { normalizeAdminR2Prefix } from '@/lib/admin-upload-path';

function decodeXmlText(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
    if (entity.startsWith('#')) {
      return String.fromCodePoint(entity[1].toLowerCase() === 'x'
        ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10));
    }
    return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[entity.toLowerCase()];
  });
}

export async function listAdminR2Directories(rawPrefix: unknown, rawCursor?: unknown): Promise<{
  prefix: string; directories: string[]; cursor: string | null;
}> {
  if (typeof rawPrefix !== 'string') throw new Error('R2 目录无效');
  const prefix = rawPrefix === '' ? '' : `${normalizeAdminR2Prefix(rawPrefix)}/`;
  if (rawCursor !== undefined && (typeof rawCursor !== 'string' || rawCursor.length > 4096)) {
    throw new Error('目录分页参数无效');
  }
  const xml = await listR2DirectoryPage(prefix, rawCursor as string | undefined);
  const truncated = xml.match(/<IsTruncated>\s*(true|false)\s*<\/IsTruncated>/)?.[1];
  if (!/<ListBucketResult(?:\s|>)/.test(xml) || !xml.includes('</ListBucketResult>') || !truncated) {
    throw new Error('R2 目录响应无效，请重试');
  }
  const encoded = /<EncodingType>url<\/EncodingType>/.test(xml);
  const directories = new Set<string>();
  for (const match of Array.from(xml.matchAll(/<CommonPrefixes>\s*<Prefix>([\s\S]*?)<\/Prefix>\s*<\/CommonPrefixes>/g))) {
    const value = decodeXmlText(match[1]);
    const path = encoded ? decodeURIComponent(value) : value;
    if (!path.startsWith(prefix) || !path.endsWith('/')) continue;
    const relative = path.slice(prefix.length, -1);
    if (!relative || relative.includes('/')) continue;
    try { directories.add(normalizeAdminR2Prefix(path)); }
    catch { /* 原图/预览目录及不符合上传路径规则的前缀不可选择。 */ }
  }
  const next = xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1];
  if (truncated === 'true' && !next) throw new Error('R2 目录分页响应无效，请重试');
  return { prefix, directories: Array.from(directories).sort(), cursor: truncated === 'true' ? decodeXmlText(next!) : null };
}
