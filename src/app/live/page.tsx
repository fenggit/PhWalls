import Home from '@/app/home/v1/Home';
import { headers } from 'next/headers';
import { getLiveTabData } from '@/lib/live-data';
import { loadLiveIndex } from '@/lib/live-data-server';
import { buildLiveMetadata, getLiveSeoCopy } from '@/lib/live-seo';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import { getI18nTexts } from '@/lib/i18n';

export const runtime = 'edge';

export async function generateMetadata() {
  const language = await resolveMetadataLanguage();
  return buildLiveMetadata(language, '/live', getLiveSeoCopy(language));
}

export default async function LivePage() {
  const language = await resolveMetadataLanguage();
  const collections = await loadLiveIndex(language);
  const tabs = getLiveTabData(language).filter((tab) => collections[tab.type]?.length);
  const copy = getLiveSeoCopy(language);
  const images = Object.fromEntries(Object.entries(collections).flatMap(([category, list]) => list.flatMap((collection) => {
    const url = buildPublicR2Url(collection.item[0]?.compressPath || '');
    return url ? [[`${category}::${collection.name}`, url]] : [];
  })));
  return <Home contentTabs={tabs} navigationTabs={tabs} contentCollectionsByCategory={collections}
    detailPathPrefix="/live/wallpapers" categoryPathPrefix="/live" initialImageUrls={images}
    isMobilePriority={/Mobi|Android|iPhone|iPad/i.test((await headers()).get('user-agent') || '')}
    heroTitle={copy.title} heroDescription={copy.description}
    wallpaperTitleSuffix={getI18nTexts(language).liveWallpapersNavLabel} collectionCardVariant="live" />;
}
