import type { Metadata } from 'next';
import HomePage from '@/app/home/v1/HomePage';
import { getI18nTexts } from '@/lib/i18n';
import {
  buildLanguageAlternates,
  getOpenGraphLocaleForLanguage,
  withLanguageUrl,
} from '@/lib/language';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { SITE_URL } from '@/lib/seo';
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_X_IMAGES } from '@/lib/social-metadata';

// Cloudflare Pages 部署必需，请勿删除
export const runtime = 'edge';

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const texts = getI18nTexts(language);
  const canonicalUrl = withLanguageUrl(SITE_URL, language);
  const title = `${texts.heroTitle} | ${texts.siteName}`;
  const description = texts.heroDescription;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(SITE_URL),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      locale: getOpenGraphLocaleForLanguage(language),
      images: DEFAULT_OPEN_GRAPH_IMAGES,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: DEFAULT_X_IMAGES,
    },
  };
}

// 首页路由页面：网站主入口，展示所有壁纸分类概览。
export default HomePage;
