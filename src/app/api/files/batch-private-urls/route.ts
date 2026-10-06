import { NextRequest, NextResponse } from 'next/server';
import { R2Service } from '@/lib/services/r2';
import { getCurrentEnvironment } from '@/lib/config/environments';
import { sanitizeWallpaperKey } from '@/lib/wallpaper-key';
import { getPublishedWallpaperKeys } from '@/lib/wallpaper-db';

export const runtime = 'edge';
const SIGNING_CONCURRENCY = 8;

export async function POST(request: NextRequest) {
  try {
    let body: { keys?: unknown };
    try {
      body = await request.json();
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json({ 
        error: 'Invalid request body',
        urls: {}
      }, { status: 400 });
    }

    const { keys } = body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      console.warn('Batch private URLs request without keys or empty keys array');
      return NextResponse.json({ 
        error: 'Keys array is required and must not be empty',
        urls: {}
      }, { status: 400 });
    }

    if (keys.length > 100) {
      return NextResponse.json({ error: 'At most 100 keys are allowed', urls: {} },
        { status: 400, headers: { 'Cache-Control': 'no-store' } });
    }

    const candidates = Array.from(
      new Set(
        keys
          .filter((key: unknown): key is string => typeof key === 'string')
          .map((key) => sanitizeWallpaperKey(key))
          .filter((key): key is string => Boolean(key))
      )
    );
    const published = await getPublishedWallpaperKeys(candidates);
    const normalizedKeys = candidates.filter((key) => published.has(key));

    if (normalizedKeys.length === 0) {
      return NextResponse.json(
        {
          error: 'Keys array must contain valid wallpaper object keys',
          urls: {},
        },
        { status: 400 }
      );
    }

    // 获取环境配置
    const environment = getCurrentEnvironment();
    
    // 检查必要的环境变量
    if (!environment.r2.accessKeyId || !environment.r2.secretAccessKey) {
      console.error('R2 credentials not configured');
      return NextResponse.json(
        { 
          error: 'R2 credentials not configured',
          urls: {}
        },
        { status: 500 }
      );
    }

    if (!environment.r2.bucket || !environment.r2.endpoint) {
      console.error('R2 bucket or endpoint not configured');
      return NextResponse.json(
        { 
          error: 'R2 bucket or endpoint not configured',
          urls: {}
        },
        { status: 500 }
      );
    }
    
    const r2Service = new R2Service(environment);
    
    const results: Record<string, string> = {};

    // 使用 R2 生成URL
    // 检查是否为私有存储桶
    const errors: string[] = [];
    
    if (environment.r2.isPrivate) {
      // 私有存储桶，生成签名URL（并发受控，避免逐条串行导致延迟过高）
      let cursor = 0;
      const workerCount = Math.min(SIGNING_CONCURRENCY, normalizedKeys.length);

      const worker = async () => {
        while (cursor < normalizedKeys.length) {
          const currentIndex = cursor;
          cursor += 1;
          const key = normalizedKeys[currentIndex];

          try {
            const privateUrl = await r2Service.getPrivateFileUrl(key, environment.r2.urlExpires);
            results[key] = privateUrl;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Failed to generate URL for ${key}: ${errorMessage}`);
          }
        }
      };

      await Promise.all(Array.from({ length: workerCount }, () => worker()));
    } else {
      normalizedKeys.forEach((key) => {
        try {
          results[key] = r2Service.getPublicFileUrl(key);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`Failed to build public URL for ${key}: ${errorMessage}`);
        }
      });
    }

    // 详细错误只记录在服务端，公开响应不返回 R2 地址或签名异常。
    if (errors.length) console.error('Batch wallpaper signing failed:', errors);
    if (errors.length > 0 && Object.keys(results).length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to generate any URLs',
          urls: results
        },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    
    // 如果部分成功，返回结果和警告
    if (errors.length > 0) {
      return NextResponse.json({ 
        urls: results,
        failedCount: errors.length,
        partial: true
      });
    }
    
    return NextResponse.json({ urls: results });
  } catch (error) {
    console.error('Error generating batch private URLs:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate batch private URLs',
        urls: {}
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

// 处理 GET 请求，返回错误信息
export async function GET() {
  return NextResponse.json(
    { 
      error: 'This endpoint only accepts POST requests',
      message: 'Please use POST method with a JSON body containing a "keys" array',
      example: {
        method: 'POST',
        body: {
          keys: ['path/to/file1.jpg', 'path/to/file2.jpg']
        }
      },
      urls: {}
    },
    { status: 405 }
  );
}
