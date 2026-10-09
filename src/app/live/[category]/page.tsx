import { notFound } from 'next/navigation';
import SeoLandingPage from '@/components/SeoLandingPage';
import { isLiveWallpaperCategory } from '@/lib/live-data';
import { loadLiveCollections } from '@/lib/live-data-server';
import { buildLiveMetadata, getLiveSeoCopy } from '@/lib/live-seo';
import { resolveMetadataLanguage } from '@/lib/metadata';

export const runtime = 'edge';
type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props) {
  const { category } = await params;
  if (!isLiveWallpaperCategory(category)) return {};
  const language = await resolveMetadataLanguage();
  return buildLiveMetadata(language, `/live/${category}`, getLiveSeoCopy(language, { category }));
}

export default async function LiveCategoryPage({ params }: Props) {
  const { category } = await params;
  if (!isLiveWallpaperCategory(category)) notFound();
  const language = await resolveMetadataLanguage();
  const collections = await loadLiveCollections(category, language);
  const copy = getLiveSeoCopy(language, { category, count: collections.length });
  return <SeoLandingPage breadcrumbLabel={copy.title} categoryKey={category} categoryPath={`/live/${category}`}
    detailCategory={category} detailPathPrefix="/live/wallpapers" seoTitle={copy.title}
    seoDescription={copy.description} seoSubtitle={copy.subtitle} cardAspect="aspect-[9/16]"
    gridClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" pageSize={20}
    collectionCardVariant="live"
    cards={collections.map((collection) => ({ deviceId: collection.deviceId, name: collection.name,
      slug: collection.slug, date: collection.date, count: collection.item.length,
      imageKey: collection.item[0]?.compressPath || null }))} />;
}
