import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import { getWallpaperDb } from '@/lib/wallpaper-db';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: '设备 ID 必填' }, { status: 400 });
  const row = await getWallpaperDb().prepare(
    `SELECT COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END), 0) AS published,
      COALESCE(SUM(CASE WHEN status != 'published' THEN 1 ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN compress_key IS NULL OR compress_key = '' THEN 1 ELSE 0 END), 0) AS missing_preview,
      COALESCE(SUM(CASE WHEN status = 'published' AND is_primary = 1 THEN 1 ELSE 0 END), 0) AS published_primary
     FROM w_wallpapers WHERE device_id = ?`
  ).bind(id).first<{ total: number; published: number; pending: number; missing_preview: number; published_primary: number }>();
  return NextResponse.json({ data: row }, { headers: { 'Cache-Control': 'no-store' } });
}
