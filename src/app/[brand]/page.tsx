import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SeoLandingPage from '@/components/SeoLandingPage';
import { buildBrandPath, getBrandCategoryBySlug } from '@/lib/brands';
import { sortByDateDesc } from '@/lib/data';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { SITE_URL } from '@/lib/seo';
import { getWallpaperCollections } from '@/lib/wallpapers';

export const runtime = 'edge';

type BrandLandingPageProps = {
  params: Promise<{
    brand: string;
  }>;
};

export async function generateMetadata({ params }: BrandLandingPageProps): Promise<Metadata> {
  const { brand } = await params;
  const brandInfo = getBrandCategoryBySlug(brand);
  if (!brandInfo) {
    return {};
  }

  const language = await resolveMetadataLanguage();
  const canonicalPath = buildBrandPath(brandInfo.type);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}${canonicalPath}`, language);
  const title = `${brandInfo.title} Wallpapers | PhWalls`;
  const description = `Download official ${brandInfo.title} built-in wallpapers in HD quality. Free and watermark-free.`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}${canonicalPath}`),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      locale: getOpenGraphLocaleForLanguage(language),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function BrandLandingPage({ params }: BrandLandingPageProps) {
  const { brand } = await params;
  const brandInfo = getBrandCategoryBySlug(brand);
  if (!brandInfo) {
    notFound();
  }

  const cards = sortByDateDesc(getWallpaperCollections(brandInfo.slug)).map((collection) => ({
    name: collection.name,
    date: collection.date,
    count: collection.item?.length || 0,
    imageKey: collection.item?.[0]?.compressPath || collection.item?.[0]?.originPath || null,
    wallpapers: collection.item || [],
  }));

  return (
    <SeoLandingPage
      breadcrumbLabel={`${brandInfo.title} Wallpapers`}
      categoryKey={brandInfo.slug}
      categoryPath={buildBrandPath(brandInfo.type)}
      detailCategory={brandInfo.slug}
      seoTitle={`${brandInfo.title} Wallpapers`}
      seoDescription={`Download official ${brandInfo.title} built-in wallpapers in HD quality. Free, watermark-free, and regularly updated.`}
      seoSubtitle={`${cards.length} official ${brandInfo.title} wallpaper collections.`}
      cardAspect="aspect-[9/16]"
      gridClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      cards={cards}
    />
  );
}
