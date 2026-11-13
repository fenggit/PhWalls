import { NextRequest, NextResponse } from 'next/server';
import { observeApiRequest } from '@/lib/api-monitor';
import { downloadRetryAfter, getDownloadQuota } from '@/lib/download-quota';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
export function GET(request: NextRequest) {
  return observeApiRequest(request, async () => {
    try {
      const quota = await getDownloadQuota(request);
      return NextResponse.json(quota, { status: quota.allowed ? 200 : 429,
        headers: { ...headers, ...(!quota.allowed ? { 'Retry-After': String(downloadRetryAfter()) } : {}) } });
    } catch { return NextResponse.json({ error: 'DOWNLOAD_QUOTA_UNAVAILABLE' }, { status: 503, headers }); }
  });
}
