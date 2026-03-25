import type { Metadata } from 'next';
import { SITE_URL } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { getI18nTexts } from '@/lib/i18n';

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const texts = getI18nTexts(language);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}/privacy`, language);
  const title = `${texts.privacyPolicyTitle} | ${texts.siteName}`;
  const description = texts.privacyPolicySubtitle;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}/privacy`),
    },
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
  };
}

// Privacy 布局页面：为隐私政策页提供独立 metadata 容器。
export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
