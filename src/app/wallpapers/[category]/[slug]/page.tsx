import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DeviceWallpaperGrid from '@/components/DeviceWallpaperGrid';
import {
  buildWallpaperDetailPath,
  findWallpaperCollection,
  isWallpaperCategory,
} from '@/lib/wallpapers';
import { SITE_URL, buildCollectionDescription, getCategoryLabelForLanguage } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { getI18nTexts } from '@/lib/i18n';
import { buildWallpaperListTitle } from '@/lib/data';
import { resolveMetadataLanguage } from '@/lib/metadata';

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

// 服务端（爬虫可见）设备类型推断，基于路径和名称
function detectDeviceGroup(item: { name: string; originPath: string; compressPath: string }): string {
  const s = `${item.name} ${item.originPath} ${item.compressPath}`.toLowerCase();
  if (s.includes('watch')) return 'Watch';
  if (s.includes('imac') || s.includes('macos/') || (s.includes('mac') && !s.includes('iphone') && !s.includes('ipad'))) return 'Mac';
  if (s.includes('landscape') && (s.includes('ipad') || s.includes('ipados'))) return 'iPad (Landscape)';
  if (s.includes('portrait') && (s.includes('ipad') || s.includes('ipados'))) return 'iPad (Portrait)';
  if (s.includes('ipad') || s.includes('ipados/')) return 'iPad';
  return 'Phone';
}

export async function generateMetadata({ params, searchParams }: WallpaperDetailPageProps): Promise<Metadata> {
  const { category, slug } = await params;
  const language = await resolveMetadataLanguage();
  const texts = getI18nTexts(language);

  if (!isWallpaperCategory(category)) {
    return {};
  }

  const collection = findWallpaperCollection(category, slug);
  if (!collection) {
    return {};
  }

  const detailPath = buildWallpaperDetailPath(category, collection.name);
  const categoryLabel = getCategoryLabelForLanguage(language, category);
  const collectionTitle = buildWallpaperListTitle(collection.name, texts.wallpapersTitleSuffix);
  const categoryTitle = buildWallpaperListTitle(categoryLabel, texts.wallpapersTitleSuffix);
  const title = `${collectionTitle} - ${categoryTitle} | PhWalls`;
  const description = buildCollectionDescription(language, {
    count: collection.item.length,
    collectionName: collection.name,
    categoryLabel,
  });
  const canonicalUrl = withLanguageUrl(`${SITE_URL}${detailPath}`, language);

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
          url: `${SITE_URL}/logo.png`,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// 壁纸详情页：展示单个壁纸系列的分组列表和预览入口。
export default async function WallpaperDetailPage({ params }: WallpaperDetailPageProps) {
  const { category, slug } = await params;

  if (!isWallpaperCategory(category)) {
    notFound();
  }

  const collection = findWallpaperCollection(category, slug);

  if (!collection) {
    notFound();
  }

  const language = await resolveMetadataLanguage();
  const detailPath = buildWallpaperDetailPath(category, collection.name);
  const categoryLabel = getCategoryLabelForLanguage(language, category);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}${detailPath}`, language);
  const categoryLandingUrl = withLanguageUrl(`${SITE_URL}/brands/${category}`, language);

  // 按设备分组（服务端，爬虫可见）
  const deviceGroups: Record<string, string[]> = {};
  for (const item of collection.item) {
    const group = detectDeviceGroup(item);
    if (!deviceGroups[group]) deviceGroups[group] = [];
    deviceGroups[group].push(item.name);
  }
  const deviceLabels = Object.keys(deviceGroups);

  // 构建服务端 CDN 图片 URL，使 SSR HTML 包含真实 src，搜索引擎/AI 爬虫可直接抓取图片
  const cdnBaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_CDN_URL;
  const initialImageUrls: Record<string, string> | undefined = cdnBaseUrl
    ? Object.fromEntries(
        collection.item
          .map((item, index) => {
            const path = item.compressPath;
            if (!path) return null;
            return [`${collection.name}-${index}`, `${cdnBaseUrl}/${path}`] as [string, string];
          })
          .filter((entry): entry is [string, string] => entry !== null)
      )
    : undefined;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: withLanguageUrl(SITE_URL, language) },
      { '@type': 'ListItem', position: 2, name: `${categoryLabel} Wallpapers`, item: categoryLandingUrl },
      { '@type': 'ListItem', position: 3, name: collection.name, item: canonicalUrl },
    ],
  };

  const imageGallerySchema = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: `${collection.name} ${categoryLabel} Wallpapers`,
    description: `${collection.item.length} official ${categoryLabel} wallpapers from ${collection.name}. High resolution, watermark-free, free to download.`,
    url: canonicalUrl,
    numberOfItems: collection.item.length,
    associatedMedia: collection.item.map((item) => ({
      '@type': 'ImageObject',
      name: item.name,
      description: `${item.name} - ${collection.name} ${categoryLabel} wallpaper`,
      contentSize: item.size,
      encodingFormat: item.type,
    })),
  };

  // 服务端渲染的摘要区块 — 供 AI 爬虫和搜索引擎抓取
  const summarySection = (
    <section className="mt-16 border-t border-gray-100 pt-8 pb-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">
        {collection.name} {categoryLabel} Wallpapers — Full Collection
      </h2>
      <p className="text-gray-600 mb-6 text-sm leading-relaxed">
        This collection includes <strong>{collection.item.length}</strong> official wallpapers
        for {deviceLabels.join(' and ')}. All images are sourced from original software
        releases — full resolution, no watermarks, free to download.
      </p>
      <div className="space-y-6">
        {deviceLabels.map((label) => (
          <div key={label}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {label} <span className="font-normal text-gray-400">({deviceGroups[label].length})</span>
            </h3>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {deviceGroups[label].map((name) => (
                <li key={name}>{name}</li>
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
      <DeviceWallpaperGrid category={category} deviceData={collection} summarySection={summarySection} initialImageUrls={initialImageUrls} />
    </>
  );
}
