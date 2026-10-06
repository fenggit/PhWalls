import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SeoLandingPage from '@/components/SeoLandingPage';
import { buildBrandPath, getBrandCategoryBySlug } from '@/lib/brands';
import { sortByDateDesc } from '@/lib/data';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { getCategorySeoCopy, SITE_URL } from '@/lib/seo';
import { loadWallpaperCollectionIndex } from '@/lib/wallpaper-data-server';
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_X_IMAGES } from '@/lib/social-metadata';

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
  const seoCopy = getCategorySeoCopy(language, brandInfo.slug);
  const canonicalPath = buildBrandPath(brandInfo.type);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}${canonicalPath}`, language);
  const title = `${seoCopy.metadataTitle} | PhWalls`;
  const description = seoCopy.description;

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

export default async function BrandLandingPage({ params }: BrandLandingPageProps) {
  const { brand } = await params;
  const brandInfo = getBrandCategoryBySlug(brand);
  if (!brandInfo) {
    notFound();
  }

  const language = await resolveMetadataLanguage();
  const cards = sortByDateDesc(await loadWallpaperCollectionIndex(brandInfo.slug, language)).map((collection) => ({
    deviceId: collection.deviceId,
    name: collection.name,
    slug: collection.slug,
    date: collection.date,
    count: collection.count ?? collection.item.length,
    imageKey: collection.item?.[0]?.compressPath || collection.item?.[0]?.originPath || null,
  }));
  const seoCopy = getCategorySeoCopy(language, brandInfo.slug, cards.length);

  return (
    <SeoLandingPage
      key={brandInfo.slug}
      breadcrumbLabel={seoCopy.title}
      categoryKey={brandInfo.slug}
      categoryPath={buildBrandPath(brandInfo.type)}
      detailCategory={brandInfo.slug}
      seoTitle={seoCopy.title}
      seoDescription={seoCopy.description}
      seoSubtitle={seoCopy.subtitle}
      cardAspect="aspect-[9/16]"
      gridClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
      cards={cards}
      pageSize={10}
    />
  );
}
