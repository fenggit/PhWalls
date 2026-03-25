import type { Metadata } from 'next';

// Cloudflare Pages 部署必需，请勿删除
export const runtime = 'edge';

import wwdcData from '@/data/WWDC.json';
import SeoLandingPage from '@/components/SeoLandingPage';
import { SITE_URL, getCategorySeoCopy } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { sortByDateDesc } from '@/lib/data';
import { resolveMetadataLanguage } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const canonicalUrl = withLanguageUrl(`${SITE_URL}/wwdc-wallpapers`, language);
  const { title, description } = getCategorySeoCopy(language, 'wwdc-wallpapers');
  const fullTitle = `${title} | PhWalls`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}/wwdc-wallpapers`),
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

// WWDC 落地页：展示 WWDC 主题壁纸系列入口卡片。
export default function WWDCWallpapersPage() {
  const cards = sortByDateDesc(wwdcData as any[]).map((item) => ({
    name: item.name,
    date: item.date,
    count: item.item?.length || 0,
    imageKey: item.item?.[0]?.compressPath || item.item?.[0]?.originPath || null,
    wallpapers: item.item || [],
  }));

  return (
    <SeoLandingPage
      breadcrumbLabel="WWDC Wallpapers"
      categoryKey="wwdc-wallpapers"
      cardAspect="aspect-[4/3]"
      gridClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      cards={cards}
    />
  );
}
