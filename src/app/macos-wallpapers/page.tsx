import type { Metadata } from 'next';

// Cloudflare Pages 部署必需，请勿删除
export const runtime = 'edge';

import macOSData from '@/data/macOS.json';
import SeoLandingPage from '@/components/SeoLandingPage';
import { SITE_URL, getCategorySeoCopy } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { sortByDateDesc } from '@/lib/data';
import { resolveMetadataLanguage } from '@/lib/metadata';

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const canonicalUrl = withLanguageUrl(`${SITE_URL}/macos-wallpapers`, language);
  const { title, description } = getCategorySeoCopy(language, 'macos-wallpapers');
  const fullTitle = `${title} | PhWalls`;

  return {
    title: fullTitle,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}/macos-wallpapers`),
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

// macOS 落地页：展示 macOS 壁纸系列入口卡片。
export default function MacOSWallpapersPage() {
  const cards = sortByDateDesc(macOSData).map((version) => ({
    name: version.name,
    date: version.date,
    count: version.item?.length || 0,
    imageKey: version.item?.[0]?.compressPath || version.item?.[0]?.originPath || null,
    wallpapers: version.item || [],
  }));

  return (
    <SeoLandingPage
      breadcrumbLabel="macOS Wallpapers"
      categoryKey="macos-wallpapers"
      cardAspect="aspect-[16/10]"
      gridClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      cards={cards}
    />
  );
}
