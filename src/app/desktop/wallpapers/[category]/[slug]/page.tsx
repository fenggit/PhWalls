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
import { parseWallpaperDate } from '@/lib/wallpaper-data';

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
  const primaryImagePath = collection.item[0]?.compressPath || collection.item[0]?.originPath;
  const primaryImageUrl = primaryImagePath
    ? buildPublicR2Url(primaryImagePath) || `${SITE_URL}/logo.png`
    : `${SITE_URL}/logo.png`;

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
      images: [{ url: primaryImageUrl, alt: seoCopy.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoCopy.title,
      description: seoCopy.description,
      images: [primaryImageUrl],
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
  const publishedDate = parseWallpaperDate(collection.date)?.toISOString().slice(0, 10);
  const seoCopy = buildDesktopDetailSeoCopy(language, {
    collectionName: collection.name,
    categoryLabel,
    count: collection.item.length,
  });
  const categoryLandingPath = `/desktop/${category}`;
  const categoryLandingUrl = withLanguageUrl(`${SITE_URL}${categoryLandingPath}`, language);

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
    ...(publishedDate ? { datePublished: publishedDate } : {}),
    associatedMedia: collection.item.map((item, index) => {
      const imageUrl = initialImageUrls?.[`${collection.name}-${index}`];
      return {
        '@type': 'ImageObject',
        name: formatWallpaperDisplayName(item.name),
        description: `${formatWallpaperDisplayName(item.name)} - ${seoCopy.galleryName}`,
        encodingFormat: item.compressPath ? 'image/webp' : item.type,
        ...(!item.compressPath ? { contentSize: item.size } : {}),
        ...(imageUrl ? { contentUrl: imageUrl, thumbnailUrl: imageUrl } : {}),
      };
    }),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: withLanguageUrl(SITE_URL, language) },
      { '@type': 'ListItem', position: 2, name: seoCopy.categoryLabel, item: categoryLandingUrl },
      { '@type': 'ListItem', position: 3, name: formatWallpaperDisplayName(collection.name), item: canonicalUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
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
