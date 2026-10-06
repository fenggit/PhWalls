import 'server-only';
import { getOptionalRequestContext } from '@cloudflare/next-on-pages';
import { headers } from 'next/headers';

type DataCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

const requestQueries = new WeakMap<object, Map<string, Promise<unknown>>>();

// Cloudflare Cache API 在每个边缘节点缓存展示数据；权限检查不得调用此函数。
// 不使用进程内长缓存，避免跨环境混用 D1 数据及开发时看不到后台修改。
export async function withWallpaperQueryCache<T>(key: unknown[], load: () => Promise<T>): Promise<T> {
  const context = getOptionalRequestContext();
  // setupDevPlatform 的 ExecutionContext 是代理共享对象，不能作为单次请求的缓存边界。
  if (process.env.NODE_ENV !== 'production' || !context?.ctx) return load();
  // 以本次 Cloudflare 请求的 ExecutionContext 为作用域，同时复用并发查询。
  const queryKey = JSON.stringify(key);
  let queries = requestQueries.get(context.ctx);
  if (!queries) {
    queries = new Map();
    requestQueries.set(context.ctx, queries);
  }
  const existing = queries.get(queryKey);
  if (existing) return existing as Promise<T>;
  const result = readEdgeCache(queryKey, load, context.ctx);
  queries.set(queryKey, result);
  return result;
}

async function readEdgeCache<T>(key: string, load: () => Promise<T>, ctx: ExecutionContext): Promise<T> {
  const edgeCache = (globalThis as unknown as { caches?: { default?: DataCache } }).caches?.default;
  if (process.env.NODE_ENV !== 'production' || !edgeCache) return load();

  let request: Request;
  try {
    const host = (await headers()).get('host');
    if (!host) return load();
    const url = new URL('/__wallpaper-query-cache/v1', `https://${host}`);
    url.searchParams.set('query', key);
    request = new Request(url);
    const cached = await edgeCache.match(request);
    if (cached) return await cached.json() as T;
  } catch {
    console.error('Wallpaper query cache read unavailable');
    return load();
  }

  const value = await load();
  // 未找到的详情和失败的查询不缓存，避免任意 slug 填满缓存及遮住新发布记录。
  if (value !== null) {
    try {
      const response = Response.json(value, { headers: { 'Cache-Control': 'public, max-age=60' } });
      ctx.waitUntil(edgeCache.put(request, response).catch(() => {
        console.error('Wallpaper query cache write unavailable');
      }));
    } catch {
      console.error('Wallpaper query cache write unavailable');
    }
  }
  return value;
}
