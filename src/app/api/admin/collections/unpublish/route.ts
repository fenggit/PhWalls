import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { unpublishAdminCollection } from '@/lib/admin-collections';
export const runtime = 'edge';
export async function POST(request: NextRequest) {
  const denied=await requireAdmin(request,true); if(denied) return denied;
  try { return NextResponse.json({data:await unpublishAdminCollection(await request.json())},{headers:{'Cache-Control':'no-store'}}); }
  catch(error) { return NextResponse.json({error:error instanceof Error?error.message:'操作失败'},{status:400,headers:{'Cache-Control':'no-store'}}); }
}
