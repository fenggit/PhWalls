// 壁纸对象 key 校验：所有图片/下载代理接口在把 key 透传到 R2 origin 之前必须先校验，
// 避免接口被当成无限速的通用代理或绕过 Cloudflare 防盗链拉取壁纸命名空间以外的对象。
//
// 真实壁纸 key 形如：
//   <brand>/<device>/origin/<file>.png
//   <brand>/<device>/compress/<file>.webp
//   desktopwalls/<os>/.../origin|compress/<file>.png
// 共同特征：包含 `/origin/` 或 `/compress/` 路径段，且以图片扩展名结尾。

const ALLOWED_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif']);

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * 规范化并校验壁纸对象 key。合法返回去掉前导斜杠的 key，非法返回 null。
 */
export function sanitizeWallpaperKey(rawKey: string | null | undefined): string | null {
  if (typeof rawKey !== 'string') {
    return null;
  }

  const decoded = safeDecode(rawKey).trim();
  if (!decoded) {
    return null;
  }

  // 去除前导斜杠后再做校验
  const key = decoded.replace(/^\/+/, '');
  if (!key) {
    return null;
  }

  // 拒绝路径穿越、反斜杠、控制字符以及协议注入（如 http:// 或 //host）
  if (
    key.includes('..') ||
    key.includes('\\') ||
    key.includes('://') ||
    key.startsWith('/') ||
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u001f\u007f]/.test(key)
  ) {
    return null;
  }

  // 必须命中壁纸资产目录结构
  if (!key.includes('/origin/') && !key.includes('/compress/')) {
    return null;
  }

  // 必须是受支持的图片扩展名
  const ext = key.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return null;
  }

  return key;
}

export function isAllowedWallpaperKey(rawKey: string | null | undefined): boolean {
  return sanitizeWallpaperKey(rawKey) !== null;
}
