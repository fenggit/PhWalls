import Home from '@/app/home/v1/Home';
import { headers } from 'next/headers';
import { getLiveTabData } from '@/lib/live-data';
import { LIVE_WALLPAPERS_PATH } from '@/lib/live-paths';
import { loadLiveIndex } from '@/lib/live-data-server';
import { buildLiveMetadata, getLiveSeoCopy } from '@/lib/live-seo';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import { getI18nTexts } from '@/lib/i18n';
import { buildWallpaperCollectionKey } from '@/lib/wallpaper-media';

export const runtime = 'edge';

const HOME_BRANDS = ['samsung', 'xiaomi', 'huawei', 'sony', 'oppo'];

export async function generateMetadata() {
  const language = await resolveMetadataLanguage();
  return buildLiveMetadata(language, LIVE_WALLPAPERS_PATH, getLiveSeoCopy(language));
}

export default async function LivePage() {
  const language = await resolveMetadataLanguage();
  const liveIndex = await loadLiveIndex(language);
  const liveTabs = getLiveTabData(language).filter((tab) => liveIndex[tab.type]?.length);
  const tabs = HOME_BRANDS.flatMap((category) =>
    liveTabs.filter((tab) => tab.type === category && liveIndex[category]?.length)
  );
  const collections = Object.fromEntries(tabs.map((tab) => [tab.type, liveIndex[tab.type]]));
  const otherBrandTabs = liveTabs.filter((tab) => !HOME_BRANDS.includes(tab.type));
  const copy = getLiveSeoCopy(language);
  const images = Object.fromEntries(Object.entries(collections).flatMap(([category, list]) => list.flatMap((collection) => {
    const url = buildPublicR2Url(collection.item[0]?.compressPath || '');
    return url ? [[buildWallpaperCollectionKey(category, collection), url]] : [];
  })));
  return <Home contentTabs={tabs} navigationTabs={tabs} contentCollectionsByCategory={collections}
    previewRows={1}
    categoryDirectoryTabs={otherBrandTabs}
    detailPathPrefix="/live/wallpapers" categoryPathPrefix={LIVE_WALLPAPERS_PATH} initialImageUrls={images}
    isMobilePriority={/Mobi|Android|iPhone|iPad/i.test((await headers()).get('user-agent') || '')}
    heroTitle={copy.title} heroDescription={copy.description}
    wallpaperTitleSuffix={getI18nTexts(language).liveWallpapersNavLabel} collectionCardVariant="live" />;
}
