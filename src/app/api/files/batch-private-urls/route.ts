import { NextRequest, NextResponse } from 'next/server';
import { R2Service } from '@/lib/services/r2';
import { getCurrentEnvironment } from '@/lib/config/environments';

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

    const normalizedKeys = Array.from(
      new Set(
        keys
          .filter((key: unknown): key is string => typeof key === 'string')
          .map((key) => key.trim())
          .filter(Boolean)
      )
    );

    if (normalizedKeys.length === 0) {
      return NextResponse.json(
        {
          error: 'Keys array must contain valid non-empty string keys',
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
          message: 'Please set R2_ACCESS_KEY_ID_PROD and R2_SECRET_ACCESS_KEY_PROD environment variables',
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
          message: 'Please set R2_BUCKET_NAME_PROD and R2_ENDPOINT_PROD environment variables',
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
      // 公开存储桶需要配置自定义域名
      return NextResponse.json(
        { 
          error: 'Public buckets require custom domain configuration. Please set R2_IS_PRIVATE_PROD=true to use signed URLs.',
          urls: {}
        },
        { status: 500 }
      );
    }

    // 如果有错误，返回错误信息
    if (errors.length > 0 && Object.keys(results).length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to generate any URLs',
          errors: errors,
          urls: results
        },
        { status: 500 }
      );
    }
    
    // 如果部分成功，返回结果和警告
    if (errors.length > 0) {
      return NextResponse.json({ 
        urls: results,
        warnings: errors,
        partial: true
      });
    }
    
    return NextResponse.json({ urls: results });
  } catch (error) {
    console.error('Error generating batch private URLs:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate batch private URLs',
        details: error instanceof Error ? error.message : 'Unknown error',
        urls: {}
      },
      { status: 500 }
    );
  }
}

// 处理 GET 请求，返回错误信息
export async function GET(request: NextRequest) {
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
