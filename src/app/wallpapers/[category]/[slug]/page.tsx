import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DeviceWallpaperGrid from '@/components/DeviceWallpaperGrid';
import {
  buildWallpaperDetailPath,
  isWallpaperCategory,
  loadWallpaperCollection,
  parseWallpaperDate,
  type WallpaperAsset,
} from '@/lib/wallpaper-data';
import { buildBrandPath, getBrandCategoryBySlug } from '@/lib/brands';
import { SITE_URL, getCategoryLabelForLanguage } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { formatWallpaperDisplayName } from '@/lib/data';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { buildPublicR2Url, hasPublicR2Cdn } from '@/lib/r2-public-url';
import {
  buildWallpaperDetailSeoCopy,
  buildWallpaperImageDescription,
  collectWallpaperVariantLabels,
  getWallpaperDeviceGroupLabel,
  type WallpaperDeviceGroup,
} from '@/lib/wallpaper-seo';

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

function collectImageFormats(items: WallpaperAsset[]): string[] {
  return Array.from(
    new Set(
      items
        .map((item) => item.type.trim().replace(/^image\//i, '').toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 4);
}

// 服务端（爬虫可见）设备类型推断，基于路径和名称
function detectDeviceGroup(item: {
  name: string;
  originPath: string;
  compressPath: string;
}): WallpaperDeviceGroup {
  const s = `${item.name} ${item.originPath} ${item.compressPath}`.toLowerCase();
  if (s.includes('watch')) return 'watch';
  if (
    s.includes('imac') ||
    s.includes('macos/') ||
    (s.includes('mac') && !s.includes('iphone') && !s.includes('ipad'))
  ) {
    return 'mac';
  }
  if (s.includes('landscape') && (s.includes('ipad') || s.includes('ipados'))) {
    return 'ipad-landscape';
  }
  if (s.includes('portrait') && (s.includes('ipad') || s.includes('ipados'))) {
    return 'ipad-portrait';
  }
  if (s.includes('ipad') || s.includes('ipados/')) return 'ipad';
  return 'phone';
}

export async function generateMetadata({ params }: WallpaperDetailPageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const language = await resolveMetadataLanguage();

  if (!isWallpaperCategory(category)) {
    return {};
  }

  const collection = await loadWallpaperCollection(category, slug);
  if (!collection) {
    return {};
  }

  const detailPath = buildWallpaperDetailPath(category, collection.name);
  const categoryLabel = getCategoryLabelForLanguage(language, category);
  const variantLabels = collectWallpaperVariantLabels(
    collection.name,
    collection.item.map((item) => item.name)
  );
  const { title, description } = buildWallpaperDetailSeoCopy(language, {
    collectionName: collection.name,
    categoryLabel,
    count: collection.item.length,
    formats: collectImageFormats(collection.item),
    variantLabels,
  });
  const canonicalUrl = withLanguageUrl(`${SITE_URL}${detailPath}`, language);
  const primaryImageUrl = collection.item[0]
    ? buildWallpaperPublicUrl(collection.item[0]) || `${SITE_URL}/logo.png`
    : `${SITE_URL}/logo.png`;

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
      images: [primaryImageUrl],
    },
  };
}

// 壁纸详情页：展示单个壁纸系列的分组列表和预览入口。
export default async function WallpaperDetailPage({ params }: WallpaperDetailPageProps) {
  const { category, slug } = await params;

  if (!isWallpaperCategory(category)) {
    notFound();
  }

  const collection = await loadWallpaperCollection(category, slug);

  if (!collection) {
    notFound();
  }

  const language = await resolveMetadataLanguage();
  const detailPath = buildWallpaperDetailPath(category, collection.name);
  const categoryLabel = getCategoryLabelForLanguage(language, category);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}${detailPath}`, language);
  const variantLabels = collectWallpaperVariantLabels(
    collection.name,
    collection.item.map((item) => item.name)
  );
  const seoCopy = buildWallpaperDetailSeoCopy(language, {
    collectionName: collection.name,
    categoryLabel,
    count: collection.item.length,
    formats: collectImageFormats(collection.item),
    variantLabels,
  });
  const publishedDate = parseWallpaperDate(collection.date)?.toISOString().slice(0, 10);
  const categoryBrand = getBrandCategoryBySlug(category);
  const categoryLandingUrl = withLanguageUrl(
    `${SITE_URL}${categoryBrand ? buildBrandPath(categoryBrand.type) : `/${category}`}`,
    language
  );

  // 按设备分组（服务端，爬虫可见）
  const deviceGroups: Partial<Record<WallpaperDeviceGroup, string[]>> = {};
  for (const item of collection.item) {
    const group = detectDeviceGroup(item);
    const groupItems = deviceGroups[group] || [];
    groupItems.push(item.name);
    deviceGroups[group] = groupItems;
  }
  const deviceLabels = Object.keys(deviceGroups) as WallpaperDeviceGroup[];
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
      { '@type': 'ListItem', position: 3, name: seoCopy.seoName, item: canonicalUrl },
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

  // 服务端渲染的摘要区块 — 供 AI 爬虫和搜索引擎抓取
  const summarySection = (
    <section className="mt-16 border-t border-gray-100 pt-8 pb-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">
        {seoCopy.summaryTitle}
      </h2>
      <p className="text-gray-600 mb-6 text-sm leading-relaxed">
        {seoCopy.summaryDescription}
      </p>
      <dl className="mb-6 grid gap-3 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="font-semibold text-gray-800">{seoCopy.labels.collection}</dt>
          <dd>{seoCopy.seoName}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-800">{seoCopy.labels.brand}</dt>
          <dd>{categoryLabel}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-800">{seoCopy.labels.files}</dt>
          <dd>{seoCopy.labels.wallpaperCount}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-800">{seoCopy.labels.updated}</dt>
          <dd>{collection.date || seoCopy.labels.recentlyUpdated}</dd>
        </div>
      </dl>
      <div className="space-y-6">
        {deviceLabels.map((label) => (
          <div key={label}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {getWallpaperDeviceGroupLabel(language, label)}{' '}
              <span className="font-normal text-gray-400">
                ({deviceGroups[label]?.length || 0})
              </span>
            </h3>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {(deviceGroups[label] || []).map((name) => (
                <li key={name}>{formatWallpaperDisplayName(name)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );

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
        displayName={seoCopy.seoName}
        summarySection={summarySection}
        initialImageUrls={initialImageUrls}
      />
    </>
  );
}
