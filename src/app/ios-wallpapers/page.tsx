import type { Metadata } from 'next';

// Cloudflare Pages 部署必需，请勿删除
export const runtime = 'edge';

import iOSData from '@/data/iOS.json';
import SeoLandingPage from '@/components/SeoLandingPage';
import { SITE_URL, getCategorySeoCopy } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { sortByDateDesc } from '@/lib/data';
import { resolveMetadataLanguage } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const canonicalUrl = withLanguageUrl(`${SITE_URL}/ios-wallpapers`, language);
  const { title, description } = getCategorySeoCopy(language, 'ios-wallpapers');
  const fullTitle = `${title} | PhWalls`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}/ios-wallpapers`),
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      type: 'website',
      locale: getOpenGraphLocaleForLanguage(language),
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
  };
}

// iOS 落地页：展示 iOS 系统壁纸系列入口卡片。
export default function IOSWallpapersPage() {
  const cards = sortByDateDesc(iOSData).map((item) => ({
    name: item.name,
    date: item.date,
    count: item.item?.length || 0,
    imageKey: item.item?.[0]?.compressPath || item.item?.[0]?.originPath || null,
    wallpapers: item.item || [],
  }));

  return (
    <SeoLandingPage
      breadcrumbLabel="iOS Wallpapers"
      categoryKey="ios-wallpapers"
      cardAspect="aspect-[9/16]"
      gridClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      cards={cards}
    />
  );
}
