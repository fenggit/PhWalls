import { NextRequest, NextResponse } from 'next/server';
import { R2Service } from '@/lib/services/r2';
import { getCurrentEnvironment } from '@/lib/config/environments';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    // 获取环境配置
    const environment = getCurrentEnvironment();
    const r2Service = new R2Service(environment);
    
    // 生成签名URL
    let fileUrl = '';
    if (environment.r2.isPrivate) {
      // 私有存储桶，生成签名URL
      fileUrl = await r2Service.getPrivateFileUrl(
        key, 
        environment.r2.urlExpires,
        undefined, // expires 参数（当第二个参数是 number 时，此参数被忽略）
        false // 不需要强制下载头，因为我们会在响应中设置
      );
    } else {
      // 公开存储桶需要配置自定义域名
      return NextResponse.json(
        { error: 'Public buckets require custom domain configuration. Please set R2_IS_PRIVATE_PROD=true to use signed URLs.' },
        { status: 500 }
      );
    }

    // 在服务器端获取文件
    const fileResponse = await fetch(fileUrl, {
      method: 'GET',
    });

    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.status} ${fileResponse.statusText}`);
    }

    // 获取文件名
    const filename = key.split('/').pop() || 'download';
    
    // 获取Content-Type
    const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';

    // 直接使用 Response 的 body stream，避免将整个文件加载到内存
    return new NextResponse(fileResponse.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename.replace(/[^\x00-\x7F]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-cache',
        // 传递原始响应的大小（如果可用）
        ...(fileResponse.headers.get('content-length') && {
          'Content-Length': fileResponse.headers.get('content-length')!,
        }),
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to download file',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

