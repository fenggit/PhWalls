import type { Metadata } from 'next';

// Cloudflare Pages 部署必需，请勿删除
export const runtime = 'edge';

import newYearData from '@/data/New Year.json';
import SeoLandingPage from '@/components/SeoLandingPage';
import { SITE_URL, getCategorySeoCopy } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { sortByDateDesc } from '@/lib/data';
import { resolveMetadataLanguage } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const canonicalUrl = withLanguageUrl(`${SITE_URL}/new-year-wallpapers`, language);
  const { title, description } = getCategorySeoCopy(language, 'new-year-wallpapers');
  const fullTitle = `${title} | PhWalls`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}/new-year-wallpapers`),
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

// New Year 落地页：展示新年主题壁纸系列入口卡片。
export default function NewYearWallpapersPage() {
  const cards = sortByDateDesc(newYearData as any[]).map((item) => ({
    name: item.name,
    date: item.date,
    count: item.item?.length || 0,
    imageKey: item.item?.[0]?.compressPath || item.item?.[0]?.originPath || null,
    wallpapers: item.item || [],
  }));

  return (
    <SeoLandingPage
      breadcrumbLabel="New Year Wallpapers"
      categoryKey="new-year-wallpapers"
      cardAspect="aspect-[4/3]"
      gridClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      cards={cards}
    />
  );
}
