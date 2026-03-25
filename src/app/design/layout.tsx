import { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { getI18nTexts } from '@/lib/i18n';

// 默认 metadata（根据用户语言输出）
export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const texts = getI18nTexts(language);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}/design`, language);
  const title = `${texts.customWallpaperTitle} | PhWalls`;
  const description = texts.customWallpaperDescription;

  return {
    title,
    description,
    keywords: texts.customWallpaperKeywords,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: getOpenGraphLocaleForLanguage(language),
      url: canonicalUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}/design`),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

// Design 布局页面：为在线壁纸设计工具提供独立 metadata 容器。
export default function DesignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
