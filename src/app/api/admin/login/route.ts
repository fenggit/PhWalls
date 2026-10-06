import { NextRequest, NextResponse } from 'next/server';
import { adminWriteOriginValid, createAdminSession, isAdminHost, setAdminCookie, verifyAdminPassword } from '@/lib/admin-auth';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  if (!isAdminHost(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!adminWriteOriginValid(request)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const body = await request.json().catch(() => null) as { username?: string; password?: string; remember?: boolean } | null;
  if (!body || !await verifyAdminPassword(body.username || '', body.password || '')) {
    return NextResponse.json({ error: '账号或密码错误' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
  }
  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  const remember = body.remember === true;
  setAdminCookie(response, await createAdminSession(remember), remember);
  return response;
}
