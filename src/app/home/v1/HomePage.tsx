import Home from './Home';
import { headers } from 'next/headers';
import { getHomeCollectionsByCategory, getInitialHomeCollections } from '@/lib/home-index';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import { getTabData } from '@/lib/data';
import { isLanguage, LANGUAGE_HEADER_NAME } from '@/lib/language';
import {
  filterHomeTabs,
  isHomeCategoryVisible,
  sortHomeTabsByPriority,
} from '@/lib/home-priority';

type WallpaperEntry = {
  name: string;
  item?: Array<{
    compressPath?: string;
    originPath?: string;
  }>;
};

const buildInitialHomeImageUrls = (collectionLimit: number) => {
  const map: Record<string, string> = {};
  const addEntry = (entry: WallpaperEntry, categorySlug: string) => {
    const firstImage = entry.item?.[0];
    const path = firstImage?.compressPath || firstImage?.originPath;
    const publicUrl = path ? buildPublicR2Url(path) : null;
    if (publicUrl) {
      map[`${categorySlug}::${entry.name}`] = publicUrl;
    }
  };

  getInitialHomeCollections(collectionLimit).forEach(({ category, collection }) => {
    if (isHomeCategoryVisible(category)) {
      addEntry(collection as WallpaperEntry, category);
    }
  });

  return map;
};

export default async function HomePage() {
  const headerList = await headers();
  const userAgent = headerList.get('user-agent') || '';
  const rawLanguage = headerList.get(LANGUAGE_HEADER_NAME);
  const language = isLanguage(rawLanguage) ? rawLanguage : undefined;
  const isMobileRequest = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
  const initialImageUrls = buildInitialHomeImageUrls(isMobileRequest ? 4 : 12);
  const homeTabs = filterHomeTabs(sortHomeTabsByPriority(getTabData(language)));
  const contentCollectionsByCategory = Object.fromEntries(
    Object.entries(getHomeCollectionsByCategory()).filter(([category]) =>
      isHomeCategoryVisible(category)
    )
  );
  return (
    <Home
      initialImageUrls={initialImageUrls}
      isMobilePriority={isMobileRequest}
      contentTabs={homeTabs.filter((tab) => tab.type.toLowerCase() !== 'desktop')}
      navigationTabs={homeTabs}
      contentCollectionsByCategory={contentCollectionsByCategory}
    />
  );
}
