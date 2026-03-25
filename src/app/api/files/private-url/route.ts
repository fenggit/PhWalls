import { NextRequest, NextResponse } from 'next/server';
import { R2Service } from '@/lib/services/r2';
import { getCurrentEnvironment } from '@/lib/config/environments';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Key parameter is required' }, { status: 400 });
    }

    // 获取环境配置
    const environment = getCurrentEnvironment();
    
    // 检查是否为私有空间
    if (!environment.r2.isPrivate) {
      // 如果是公开空间，需要配置自定义域名
      return NextResponse.json(
        { error: 'Public buckets require custom domain configuration. Please set R2_IS_PRIVATE_PROD=true to use signed URLs.' },
        { status: 500 }
      );
    }

    // 创建 R2 服务实例
    const r2Service = new R2Service(environment);
    
    // 生成私有URL（不需要 domain 参数，使用 endpoint）
    const privateUrl = await r2Service.getPrivateFileUrl(
      key, 
      environment.r2.urlExpires
    );

    return NextResponse.json({ url: privateUrl });
  } catch (error) {
    console.error('Error generating private URL:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate private URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
