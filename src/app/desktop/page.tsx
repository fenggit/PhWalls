import type { Metadata } from 'next';
import Home from '@/app/home/v1/Home';
import {
  getDesktopTabData,
  getDesktopWallpaperCollections,
  getAllDesktopWallpaperCollections,
} from '@/lib/desktop-wallpapers';
import { getDesktopHomeSeoCopy } from '@/lib/desktop-seo';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { SITE_URL } from '@/lib/seo';
import { headers } from 'next/headers';

export const runtime = 'edge';

type WallpaperEntry = {
  name: string;
  item?: Array<{
    compressPath?: string;
    originPath?: string;
  }>;
};

function buildInitialDesktopImageUrls() {
  const map: Record<string, string> = {};
  const addEntry = (entry: WallpaperEntry, categorySlug: string) => {
    const firstImage = entry.item?.[0];
    const path = firstImage?.compressPath || firstImage?.originPath;
    const publicUrl = path ? buildPublicR2Url(path) : null;
    if (publicUrl) {
      map[`${categorySlug}::${entry.name}`] = publicUrl;
    }
  };

  getAllDesktopWallpaperCollections().forEach(({ category, collection }) => {
    addEntry(collection as WallpaperEntry, category);
  });

  return map;
}

function buildDesktopCollectionsByCategory() {
  return Object.fromEntries(
    getDesktopTabData().map((tab) => [tab.type, getDesktopWallpaperCollections(tab.type)])
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveMetadataLanguage();
  const seoCopy = getDesktopHomeSeoCopy(language);
  const canonicalUrl = withLanguageUrl(`${SITE_URL}/desktop`, language);

  return {
    title: `${seoCopy.title} | PhWalls`,
    description: seoCopy.description,
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(`${SITE_URL}/desktop`),
    },
    openGraph: {
      title: `${seoCopy.title} | PhWalls`,
      description: seoCopy.description,
      url: canonicalUrl,
      type: 'website',
      locale: getOpenGraphLocaleForLanguage(language),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${seoCopy.title} | PhWalls`,
      description: seoCopy.description,
    },
  };
}

export default async function DesktopPage() {
  const headerList = await headers();
  const userAgent = headerList.get('user-agent') || '';
  const isMobileRequest = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
  const language = await resolveMetadataLanguage();
  const seoCopy = getDesktopHomeSeoCopy(language);

  return (
    <Home
      contentTabs={getDesktopTabData()}
      navigationTabs={getDesktopTabData()}
      initialImageUrls={buildInitialDesktopImageUrls()}
      isMobilePriority={isMobileRequest}
      contentCollectionsByCategory={buildDesktopCollectionsByCategory()}
      detailPathPrefix="/desktop/wallpapers"
      categoryPagePrefix="/desktop"
      forceDesktopCards
      heroTitle={seoCopy.title}
      heroDescription={seoCopy.description}
    />
  );
}
