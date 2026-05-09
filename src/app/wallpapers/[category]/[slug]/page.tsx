import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DeviceWallpaperGrid from '@/components/DeviceWallpaperGrid';
import {
  buildWallpaperDetailPath,
  findWallpaperCollection,
  isWallpaperCategory,
} from '@/lib/wallpapers';
import { buildBrandPath, getBrandCategoryBySlug } from '@/lib/brands';
import { SITE_URL, getCategoryLabelForLanguage } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { getI18nTexts } from '@/lib/i18n';
import { buildWallpaperListTitle, formatWallpaperDisplayName } from '@/lib/data';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { buildPublicR2Url, hasPublicR2Cdn } from '@/lib/r2-public-url';

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

const SEO_VARIANT_RULES: Array<{ token: string; label: string }> = [
  { token: 'pro', label: 'Pro' },
  { token: 'ultra', label: 'Ultra' },
  { token: 'plus', label: 'Plus' },
  { token: 'max', label: 'Max' },
  { token: 'fe', label: 'FE' },
  { token: 'fold', label: 'Fold' },
  { token: 'flip', label: 'Flip' },
  { token: 'lite', label: 'Lite' },
  { token: 'se', label: 'SE' },
];

function collectVariantLabels(collectionName: string, itemNames: string[]): string[] {
  const source = `${collectionName} ${itemNames.join(' ')}`.toLowerCase();
  const collectionNameLower = collectionName.toLowerCase();

  return SEO_VARIANT_RULES
    .filter(({ token }) => source.includes(token) && !collectionNameLower.includes(token))
    .map(({ label }) => label)
    .slice(0, 2);
}

function buildSeoTitle(baseName: string, variantLabels: string[]): string {
  const variantText = variantLabels.length > 0 ? ` (${variantLabels.join(', ')})` : '';
  return `${baseName}${variantText} Wallpapers in 4K HD (Official, Free Download) | PhWalls`;
}

function buildSeoDescription(baseName: string, variantLabels: string[]): string {
  const variantText = variantLabels.length > 0 ? `, including ${variantLabels.join(' and ')} variants,` : '';
  return `Download official ${baseName} wallpapers${variantText} in 4K/HD, full resolution, no watermark. Preview all stock wallpapers and download free.`;
}

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
  const variantLabels = collectVariantLabels(
    formatWallpaperDisplayName(collection.name),
    collection.item.map((item) => item.name)
  );
  const title = buildSeoTitle(formatWallpaperDisplayName(collectionTitle), variantLabels);
  const description = buildSeoDescription(formatWallpaperDisplayName(collection.name), variantLabels);
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
  const categoryBrand = getBrandCategoryBySlug(category);
  const categoryLandingUrl = withLanguageUrl(
    `${SITE_URL}${categoryBrand ? buildBrandPath(categoryBrand.type) : `/${category}`}`,
    language
  );

  // 按设备分组（服务端，爬虫可见）
  const deviceGroups: Record<string, string[]> = {};
  for (const item of collection.item) {
    const group = detectDeviceGroup(item);
    if (!deviceGroups[group]) deviceGroups[group] = [];
    deviceGroups[group].push(item.name);
  }
  const deviceLabels = Object.keys(deviceGroups);

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
      { '@type': 'ListItem', position: 1, name: 'Home', item: withLanguageUrl(SITE_URL, language) },
      { '@type': 'ListItem', position: 2, name: `${categoryLabel} Wallpapers`, item: categoryLandingUrl },
      { '@type': 'ListItem', position: 3, name: formatWallpaperDisplayName(collection.name), item: canonicalUrl },
    ],
  };

  const imageGallerySchema = {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name: `${formatWallpaperDisplayName(collection.name)} ${categoryLabel} Wallpapers`,
    description: `${collection.item.length} official ${categoryLabel} wallpapers from ${formatWallpaperDisplayName(collection.name)}. High resolution, watermark-free, free to download.`,
    url: canonicalUrl,
    numberOfItems: collection.item.length,
    associatedMedia: collection.item.map((item) => ({
      '@type': 'ImageObject',
      name: formatWallpaperDisplayName(item.name),
      description: `${formatWallpaperDisplayName(item.name)} - ${formatWallpaperDisplayName(collection.name)} ${categoryLabel} wallpaper`,
      contentSize: item.size,
      encodingFormat: item.type,
    })),
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `Are these ${formatWallpaperDisplayName(collection.name)} wallpapers official?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Yes. We collect official stock wallpapers for ${formatWallpaperDisplayName(collection.name)} from software releases.`,
        },
      },
      {
        '@type': 'Question',
        name: 'Are the wallpapers available in 4K/HD?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Many wallpapers are available in 4K/HD full resolution, depending on the original release files.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I download these wallpapers for free?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. All wallpapers on this page are free to preview and download.',
        },
      },
    ],
  };

  // 服务端渲染的摘要区块 — 供 AI 爬虫和搜索引擎抓取
  const summarySection = (
    <section className="mt-16 border-t border-gray-100 pt-8 pb-4">
      <h2 className="text-xl font-semibold text-gray-800 mb-3">
        {formatWallpaperDisplayName(collection.name)} {categoryLabel} Wallpapers — Full Collection
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <DeviceWallpaperGrid category={category} deviceData={collection} summarySection={summarySection} initialImageUrls={initialImageUrls} />
    </>
  );
}
