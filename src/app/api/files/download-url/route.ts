import { NextRequest, NextResponse } from 'next/server';
import { R2Service } from '@/lib/services/r2';
import { getCurrentEnvironment } from '@/lib/config/environments';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { key } = await request.json();

    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    // 获取环境配置
    const environment = getCurrentEnvironment();
    const r2Service = new R2Service(environment);
    
    let downloadUrl = '';
    
    // 使用 R2 生成下载URL
    // 检查是否为私有存储桶
    if (environment.r2.isPrivate) {
      // 私有存储桶，生成带下载头的签名URL
      // 使用AWS S3兼容的ResponseContentDisposition参数
      // 参考: https://developers.cloudflare.com/r2/api/s3/presigned-urls/
      downloadUrl = await r2Service.getPrivateFileUrl(
        key, 
        environment.r2.urlExpires,
        undefined, // expires 参数（当第二个参数是 number 时，此参数被忽略）
        true // forceDownload = true, 会添加 ResponseContentDisposition 参数
      );
    } else {
      // 公开存储桶需要配置自定义域名
      return NextResponse.json(
        { error: 'Public buckets require custom domain configuration. Please set R2_IS_PRIVATE_PROD=true to use signed URLs.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: downloadUrl,
      filename: key.split('/').pop() || 'download'
    });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate download URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

