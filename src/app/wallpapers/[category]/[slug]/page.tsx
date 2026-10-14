import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DeviceWallpaperGrid from '@/components/DeviceWallpaperGrid';
import {
  buildWallpaperDetailPath,
  isWallpaperCategory,
  parseWallpaperDate,
  type WallpaperAsset,
} from '@/lib/wallpaper-data';
import { loadWallpaperCollection } from '@/lib/wallpaper-data-server';
import { buildBrandPath, getBrandCategoryBySlug } from '@/lib/brands';
import { SITE_URL, getCategoryLabelForLanguage } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { formatWallpaperDisplayName } from '@/lib/data';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { buildPublicR2Url, hasPublicR2Cdn } from '@/lib/r2-public-url';
import {
  buildWallpaperCollectionSeoCopy,
  buildWallpaperImageDescription,
} from '@/lib/wallpaper-seo';
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_X_IMAGES } from '@/lib/social-metadata';

export const runtime = 'edge';

type WallpaperDetailPageProps = {
  params: Promise<{
    category: string;
    slug: string;
  }>;
  searchParams: Promise<{
    lang?: string | string[];
  }>;
};

function normalizeImageEncodingFormat(type: string): string | undefined {
  const normalized = type.trim().toLowerCase();
  if (!normalized) return undefined;
  return normalized.startsWith('image/') ? normalized : `image/${normalized}`;
}

function buildWallpaperPublicUrl(item: WallpaperAsset): string | null {
  const path = item.compressPath || item.originPath;
  return path ? buildPublicR2Url(path) : null;
}

function getWallpaperPublicEncodingFormat(item: WallpaperAsset): string | undefined {
  return item.compressPath ? 'image/webp' : normalizeImageEncodingFormat(item.type);
}

export async function generateMetadata({ params }: WallpaperDetailPageProps): Promise<Metadata> {
  const { category, slug } = await params;

  if (!isWallpaperCategory(category)) {
    return {};
  }

  const language = await resolveMetadataLanguage();
  const collection = await loadWallpaperCollection(category, slug, language);
  if (!collection) {
    return {};
  }

  const detailPath = buildWallpaperDetailPath(category, collection.slug || collection.name);
  const categoryLabel = getCategoryLabelForLanguage(language, category);
  const { title, description } = buildWallpaperCollectionSeoCopy(language, collection, categoryLabel);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}${detailPath}`, language);
  const primaryImageUrl = collection.item[0]
    ? buildWallpaperPublicUrl(collection.item[0]) || `${SITE_URL}/brand/option-03/logo.png`
    : `${SITE_URL}/brand/option-03/logo.png`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}${detailPath}`),
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonicalUrl,
      locale: getOpenGraphLocaleForLanguage(language),
      images: [
        ...DEFAULT_OPEN_GRAPH_IMAGES,
        {
          url: primaryImageUrl,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: DEFAULT_X_IMAGES,
    },
  };
}

// 壁纸详情页：展示单个壁纸系列的分组列表和预览入口。
export default async function WallpaperDetailPage({ params }: WallpaperDetailPageProps) {
  const { category, slug } = await params;

  if (!isWallpaperCategory(category)) {
    notFound();
  }

  const language = await resolveMetadataLanguage();
  const collection = await loadWallpaperCollection(category, slug, language);

  if (!collection) {
    notFound();
  }

  const detailPath = buildWallpaperDetailPath(category, collection.slug || collection.name);
  const categoryLabel = getCategoryLabelForLanguage(language, category);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}${detailPath}`, language);
  const seoCopy = buildWallpaperCollectionSeoCopy(language, collection, categoryLabel);
  const publishedDate = parseWallpaperDate(collection.date)?.toISOString().slice(0, 10);
  const categoryBrand = getBrandCategoryBySlug(category);
  const categoryLandingUrl = withLanguageUrl(
    `${SITE_URL}${categoryBrand ? buildBrandPath(categoryBrand.type) : `/${category}`}`,
    language
  );

  // 构建服务端 CDN 图片 URL，使 SSR HTML 包含真实 src，搜索引擎/AI 爬虫可直接抓取图片
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

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: seoCopy.breadcrumbHome,
        item: withLanguageUrl(SITE_URL, language),
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: seoCopy.breadcrumbCategory,
        item: categoryLandingUrl,
      },
      { '@type': 'ListItem', position: 3, name: collection.name, item: canonicalUrl },
    ],
  };

  const imageGallerySchema = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: seoCopy.galleryName,
    description: seoCopy.galleryDescription,
    url: canonicalUrl,
    inLanguage: language,
    numberOfItems: collection.item.length,
    ...(publishedDate ? { datePublished: publishedDate } : {}),
    associatedMedia: collection.item.map((item, index) => {
      const imageUrl = initialImageUrls?.[`${collection.name}-${index}`] || buildWallpaperPublicUrl(item);
      return {
        '@type': 'ImageObject',
        name: formatWallpaperDisplayName(item.name),
        description: buildWallpaperImageDescription(
          language,
          formatWallpaperDisplayName(item.name),
          seoCopy.seoName,
          categoryLabel
        ),
        encodingFormat: getWallpaperPublicEncodingFormat(item),
        ...(!item.compressPath ? { contentSize: item.size } : {}),
        ...(imageUrl ? { contentUrl: imageUrl, thumbnailUrl: imageUrl } : {}),
      };
    }),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, '\\u003c') }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(imageGallerySchema).replace(/</g, '\\u003c') }}
      />
      <DeviceWallpaperGrid
        category={category}
        deviceData={collection}
        displayName={seoCopy.seoName}
        initialImageUrls={initialImageUrls}
      />
    </>
  );
}
