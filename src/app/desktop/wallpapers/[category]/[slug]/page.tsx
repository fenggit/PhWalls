import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DeviceWallpaperGrid from '@/components/DeviceWallpaperGrid';
import {
  buildDesktopWallpaperDetailPath,
  getDesktopTabData,
  getDesktopWallpaperCategoryLabel,
  isDesktopWallpaperCategory,
  loadDesktopWallpaperCollection,
} from '@/lib/desktop-data';
import { formatWallpaperDisplayName } from '@/lib/data';
import { buildDesktopDetailSeoCopy, getDesktopCategoryLabel } from '@/lib/desktop-seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { buildPublicR2Url, hasPublicR2Cdn } from '@/lib/r2-public-url';
import { SITE_URL } from '@/lib/seo';

export const runtime = 'edge';

type DesktopWallpaperDetailPageProps = {
  params: Promise<{
    category: string;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: DesktopWallpaperDetailPageProps): Promise<Metadata> {
  const { category, slug } = await params;
  if (!isDesktopWallpaperCategory(category)) {
    return {};
  }

  const collection = await loadDesktopWallpaperCollection(category, slug);
  if (!collection) {
    return {};
  }

  const language = await resolveMetadataLanguage();
  const categoryLabel = getDesktopWallpaperCategoryLabel(category);
  const seoCopy = buildDesktopDetailSeoCopy(language, {
    collectionName: collection.name,
    categoryLabel,
    count: collection.item.length,
  });
  const detailPath = buildDesktopWallpaperDetailPath(category, collection.name);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}${detailPath}`, language);

  return {
    title: seoCopy.title,
    description: seoCopy.description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}${detailPath}`),
    },
    openGraph: {
      title: seoCopy.title,
      description: seoCopy.description,
      type: 'article',
      url: canonicalUrl,
      locale: getOpenGraphLocaleForLanguage(language),
      images: [{ url: `${SITE_URL}/logo.png`, alt: seoCopy.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoCopy.title,
      description: seoCopy.description,
    },
  };
}

export default async function DesktopWallpaperDetailPage({ params }: DesktopWallpaperDetailPageProps) {
  const { category, slug } = await params;
  if (!isDesktopWallpaperCategory(category)) {
    notFound();
  }

  const collection = await loadDesktopWallpaperCollection(category, slug);
  if (!collection) {
    notFound();
  }

  const language = await resolveMetadataLanguage();
  const detailPath = buildDesktopWallpaperDetailPath(category, collection.name);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}${detailPath}`, language);
  const categoryLabel = getDesktopWallpaperCategoryLabel(category);
  const seoCopy = buildDesktopDetailSeoCopy(language, {
    collectionName: collection.name,
    categoryLabel,
    count: collection.item.length,
  });
  const categoryLandingPath = '/desktop';

  const initialImageUrls: Record<string, string> | undefined = hasPublicR2Cdn()
    ? Object.fromEntries(
        collection.item
          .map((item, index) => {
            const path = item.compressPath || item.originPath;
            const publicUrl = path ? buildPublicR2Url(path) : null;
            if (!publicUrl) return null;
            return [`${collection.name}-${index}`, publicUrl] as [string, string];
          })
          .filter((entry): entry is [string, string] => entry !== null)
      )
    : undefined;

  const summarySection = (
    <section className="mt-16 border-t border-gray-100 pt-8 pb-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">
        {seoCopy.summaryTitle}
      </h2>
      <p className="text-gray-600 mb-6 text-sm leading-relaxed">
        {seoCopy.summaryDescription}
      </p>
    </section>
  );

  const imageGallerySchema = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: seoCopy.galleryName,
    description: seoCopy.galleryDescription,
    url: canonicalUrl,
    numberOfItems: collection.item.length,
    associatedMedia: collection.item.map((item) => ({
      '@type': 'ImageObject',
      name: formatWallpaperDisplayName(item.name),
      contentSize: item.size,
      encodingFormat: item.type,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(imageGallerySchema) }}
      />
      <DeviceWallpaperGrid
        category={category}
        deviceData={collection}
        summarySection={summarySection}
        initialImageUrls={initialImageUrls}
        tabDataOverride={getDesktopTabData()}
        categoryLabelOverride={getDesktopCategoryLabel(language)}
        categoryLandingPathOverride={categoryLandingPath}
        categoryPathPrefixOverride="/desktop"
      />
    </>
  );
}
