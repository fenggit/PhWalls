import type { Metadata } from 'next';
import NotFoundContent from '@/components/NotFoundContent';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { getI18nTexts } from '@/lib/i18n';

// next-on-pages 无法识别 not-found.tsx 的 edge runtime 配置（Next.js 编译限制）
// 改为强制静态生成：静态页无需声明 edge runtime，可正常部署到 Cloudflare Pages
export const dynamic = 'force-static';

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const texts = getI18nTexts(language);
  const title = `${texts.notFoundHeroTitle} | ${texts.siteName}`;
  const description = texts.notFoundHeroDescription;

  return {
    title,
    description,
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

// 404 页面：处理未命中路由并提供回首页入口。
export default function NotFound() {
  return <NotFoundContent />;
}
