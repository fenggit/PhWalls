import { notFound } from 'next/navigation';
import DeviceWallpaperGrid from '@/components/DeviceWallpaperGrid';
import { getI18nTexts } from '@/lib/i18n';
import { buildLiveWallpaperDetailPath, isLiveWallpaperCategory } from '@/lib/live-data';
import { buildLiveCategoryPath } from '@/lib/live-paths';
import { loadLiveCollection } from '@/lib/live-data-server';
import { buildLiveMetadata, getLiveSeoCopy } from '@/lib/live-seo';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import { SITE_URL } from '@/lib/seo';
import { withLanguageUrl } from '@/lib/language';

export const runtime = 'edge';
type Props = { params: Promise<{ category: string; slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { category, slug } = await params;
  if (!isLiveWallpaperCategory(category)) return {};
  const language = await resolveMetadataLanguage();
  const collection = await loadLiveCollection(category, slug, language);
  if (!collection) return {};
  return buildLiveMetadata(language, buildLiveWallpaperDetailPath(category, slug),
    getLiveSeoCopy(language, { category, name: collection.name, count: collection.item.length,
      seoTitle: collection.seoTitle, description: collection.description }),
    buildPublicR2Url(collection.item[0]?.compressPath || ''));
}

export default async function LiveDetailPage({ params }: Props) {
  const { category, slug } = await params;
  if (!isLiveWallpaperCategory(category)) notFound();
  const language = await resolveMetadataLanguage();
  const collection = await loadLiveCollection(category, slug, language);
  if (!collection) notFound();
  const copy = getLiveSeoCopy(language, { category, name: collection.name, count: collection.item.length,
    seoTitle: collection.seoTitle, description: collection.description });
  const texts = getI18nTexts(language);
  const url = withLanguageUrl(`${SITE_URL}${buildLiveWallpaperDetailPath(category, slug)}`, language);
  const images = Object.fromEntries(collection.item.map((item, index) =>
    [`${collection.name}-${index}`, buildPublicR2Url(item.compressPath) || '']));
  const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: copy.title, description: copy.description, url, inLanguage: language,
    mainEntity: { '@type': 'ItemList', numberOfItems: collection.item.length,
      itemListElement: collection.item.map((item, index) => ({ '@type': 'ListItem', position: index + 1,
        item: { '@type': 'VideoObject', name: item.name, description: copy.description,
          thumbnailUrl: images[`${collection.name}-${index}`], encodingFormat: item.type,
          contentUrl: `${SITE_URL}/api/files/preview?key=${encodeURIComponent(item.originPath)}`,
          uploadDate: '2026-10-07T00:00:00+08:00' } })) } };
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    <DeviceWallpaperGrid category={category} deviceData={{ ...collection, seoTitle: copy.title, description: copy.description }}
      initialImageUrls={images} categoryLabelOverride={texts.liveWallpapersNavLabel}
      wallpaperGroupLabelOverride={texts.liveWallpapersNavLabel}
      categoryLandingPathOverride={buildLiveCategoryPath(category)}
      summarySection={<section className="mt-16 border-t border-gray-100 pt-8 pb-4">
        <h2 className="mb-3 text-xl font-semibold text-gray-800">{copy.title}</h2>
        <p className="text-sm leading-relaxed text-gray-600">{copy.description}</p>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">{texts.liveCompatibilityNote}</p>
      </section>} />
  </>;
}
