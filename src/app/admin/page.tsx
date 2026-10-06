import { redirect } from 'next/navigation';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// 旧入口由中间件保留查询参数并重定向；页面兜底也只进入新入口。
export default function LegacyAdminPage() {
  redirect('/manager');
}
