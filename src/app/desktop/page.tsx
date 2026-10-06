import type { Metadata } from 'next';
import Home from '@/app/home/v1/Home';
import {
  getDesktopTabData,
  getDesktopWallpaperCollections,
} from '@/lib/desktop-wallpapers';
import { getDesktopHomeSeoCopy } from '@/lib/desktop-seo';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { SITE_URL } from '@/lib/seo';
import { headers } from 'next/headers';
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_X_IMAGES } from '@/lib/social-metadata';
import { loadDbIndex, isWallpaperDbEnabled } from '@/lib/wallpaper-db';

export const runtime = 'edge';

type WallpaperEntry = {
  name: string;
  item?: Array<{
    compressPath?: string;
    originPath?: string;
  }>;
};

function buildInitialDesktopImageUrls(collections: Record<string, import('@/lib/wallpaper-data').WallpaperCollection[]>) {
  const map: Record<string, string> = {};
  const addEntry = (entry: WallpaperEntry, categorySlug: string) => {
    const firstImage = entry.item?.[0];
    const path = firstImage?.compressPath || firstImage?.originPath;
    const publicUrl = path ? buildPublicR2Url(path) : null;
    if (publicUrl) {
      map[`${categorySlug}::${entry.name}`] = publicUrl;
    }
  };

  Object.entries(collections).forEach(([category, list]) =>
    list.forEach((collection) => addEntry(collection as WallpaperEntry, category)));

  return map;
}

async function buildDesktopCollectionsByCategory(language: import('@/types').Language) {
  if (isWallpaperDbEnabled()) return loadDbIndex(getDesktopTabData().map((tab) => tab.type), language);
  return Object.fromEntries(
    getDesktopTabData().map((tab) => [tab.type, getDesktopWallpaperCollections(tab.type)])
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const seoCopy = getDesktopHomeSeoCopy(language);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}/desktop`, language);

  return {
    title: `${seoCopy.metadataTitle} | PhWalls`,
    description: seoCopy.description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}/desktop`),
    },
    openGraph: {
      title: `${seoCopy.metadataTitle} | PhWalls`,
      description: seoCopy.description,
      url: canonicalUrl,
      type: 'website',
      locale: getOpenGraphLocaleForLanguage(language),
      images: DEFAULT_OPEN_GRAPH_IMAGES,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${seoCopy.metadataTitle} | PhWalls`,
      description: seoCopy.description,
      images: DEFAULT_X_IMAGES,
    },
  };
}

export default async function DesktopPage() {
  const headerList = await headers();
  const userAgent = headerList.get('user-agent') || '';
  const isMobileRequest = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
  const language = await resolveMetadataLanguage();
  const seoCopy = getDesktopHomeSeoCopy(language);
  const collections = await buildDesktopCollectionsByCategory(language);

  return (
    <Home
      contentTabs={getDesktopTabData()}
      navigationTabs={getDesktopTabData()}
      initialImageUrls={buildInitialDesktopImageUrls(collections)}
      isMobilePriority={isMobileRequest}
      contentCollectionsByCategory={collections}
      detailPathPrefix="/desktop/wallpapers"
      categoryPathPrefix="/desktop"
      forceDesktopCards
      heroTitle={seoCopy.title}
      heroDescription={seoCopy.description}
    />
  );
}
