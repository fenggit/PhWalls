const PUBLIC_R2_CDN_URL = 'https://static.phwalls.com';

const encodeObjectKey = (key: string): string => {
  return key
    .split('/')
    .map((segment) => {
      if (!segment) return '';
      return encodeURIComponent(segment)
        .replace(/\(/g, '%28')
        .replace(/\)/g, '%29');
    })
    .join('/');
};

export const hasPublicR2Cdn = (): boolean => {
  return PUBLIC_R2_CDN_URL.length > 0;
};

export const buildPublicR2Url = (key: string): string | null => {
  const normalizedKey = String(key || '').trim().replace(/^\/+/, '');
  if (!PUBLIC_R2_CDN_URL || !normalizedKey) {
    return null;
  }

  return `${PUBLIC_R2_CDN_URL}/${encodeObjectKey(normalizedKey)}`;
};