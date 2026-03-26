import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { getI18nTexts } from '@/lib/i18n';
import { getAboutBrandCopy, getBrandTitlesFromTabs } from '@/lib/brand-copy';

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const texts = getI18nTexts(language);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}/about`, language);
  const title = `${texts.aboutTitle} | PhWalls`;
  const brandTitles = getBrandTitlesFromTabs(language);
  const description = getAboutBrandCopy(language, brandTitles).subtitle;
  const keywordList = [
    'PhWalls',
    'phone wallpapers',
    ...brandTitles.map((brand) => `${brand.toLowerCase()} wallpapers`),
  ].join(', ');

  return {
    title,
    description,
    keywords: keywordList,
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
