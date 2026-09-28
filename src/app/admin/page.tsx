import type { Metadata } from 'next';
import AdminConsole from './AdminConsole';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: '壁纸管理 | PhWalls', robots: { index: false, follow: false } };

export default function AdminPage() {
  return <AdminConsole />;
}
