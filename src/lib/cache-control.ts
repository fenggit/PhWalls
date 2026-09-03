// 图片文件名/对象 key 保持稳定且不覆盖时，可以让浏览器和 CDN 缓存 1 年。
// 如果需要替换图片内容，应使用新的文件名/key，或在 Cloudflare 手动 purge 旧 URL。
export const IMAGE_IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, s-maxage=31536000, immutable';

// 壁纸清单随部署更新。浏览器短缓存、边缘节点长缓存，降低首页预览 API 的冷启动与重复 JSON 解析。
export const WALLPAPER_LIST_CACHE_CONTROL =
  'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800';

// 下载接口会带 Content-Disposition，避免不同文件名或权限场景被浏览器/CDN 复用。
export const DOWNLOAD_CACHE_CONTROL = 'no-store';
