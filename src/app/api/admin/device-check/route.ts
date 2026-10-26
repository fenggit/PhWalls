import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { assertText } from '@/lib/admin-data';
import { checkAdminCollection } from '@/lib/admin-collections';
export const runtime = 'edge';
export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request); if (denied) return denied;
  try {
    const params=request.nextUrl.searchParams;
    const id=assertText(params.get('id'),'设备 ID',80);
    const data=await checkAdminCollection(id,{wallpaper_ids:params.has('ids')?JSON.parse(params.get('ids')!):undefined,
      media_type:params.get('media') || undefined,operation:params.get('operation') || undefined});
    return NextResponse.json({data},{headers:{'Cache-Control':'no-store'}});
  } catch(error) { return NextResponse.json({error:error instanceof Error?error.message:'检查失败'},{status:400,headers:{'Cache-Control':'no-store'}}); }
}
