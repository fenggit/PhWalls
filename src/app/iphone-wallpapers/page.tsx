import type { Metadata } from 'next';

// Cloudflare Pages 部署必需，请勿删除
export const runtime = 'edge';

import iPhoneData from '@/data/iPhone.json';
import { SITE_URL, getCategorySeoCopy } from '@/lib/seo';
import SeoLandingPage from '@/components/SeoLandingPage';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { sortByDateDesc } from '@/lib/data';
import { resolveMetadataLanguage } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const canonicalUrl = withLanguageUrl(`${SITE_URL}/iphone-wallpapers`, language);
  const { title, description } = getCategorySeoCopy(language, 'iphone-wallpapers');
  const fullTitle = `${title} | PhWalls`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}/iphone-wallpapers`),
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

// iPhone 落地页：展示 iPhone 壁纸系列入口卡片。
export default function IPhoneWallpapersPage() {
  const cards = sortByDateDesc(iPhoneData).map((device) => ({
    name: device.name,
    date: device.date,
    count: device.item?.length || 0,
    imageKey: device.item?.[0]?.compressPath || device.item?.[0]?.originPath || null,
    wallpapers: device.item || [],
  }));

  return (
    <SeoLandingPage
      breadcrumbLabel="iPhone Wallpapers"
      categoryKey="iphone-wallpapers"
      cardAspect="aspect-[9/16]"
      gridClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      cards={cards}
    />
  );
}
