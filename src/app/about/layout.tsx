import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { getI18nTexts } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const texts = getI18nTexts(language);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}/about`, language);
  const title = `${texts.aboutTitle} | PhWalls`;
  const description = texts.aboutSubtitle;

  return {
    title,
    description,
    keywords:
      'PhWalls, original Apple wallpapers, iPhone wallpapers, iPad wallpapers, Mac wallpapers, iOS wallpapers, iPadOS wallpapers, macOS wallpapers, 4K wallpapers, 5K wallpapers, 6K wallpapers',
    openGraph: {
      title,
      description,
      type: 'website',
      locale: getOpenGraphLocaleForLanguage(language),
      url: canonicalUrl,
      siteName: 'PhWalls',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}/about`),
    },
  };
}

// About 布局页面：为关于页提供独立 metadata 容器。
export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
