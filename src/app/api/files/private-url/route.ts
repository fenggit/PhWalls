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
    
    // 创建 R2 服务实例
    const r2Service = new R2Service(environment);

    const url = environment.r2.isPrivate
      ? await r2Service.getPrivateFileUrl(key, environment.r2.urlExpires)
      : r2Service.getPublicFileUrl(key);

    return NextResponse.json({ url });
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
