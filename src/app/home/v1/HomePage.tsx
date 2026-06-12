import Home from './Home';
import { headers } from 'next/headers';
import { getAllHomeCollections, getHomeCollectionsByCategory } from '@/lib/home-index';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import { getTabData } from '@/lib/data';

type WallpaperEntry = {
  name: string;
  item?: Array<{
    compressPath?: string;
    originPath?: string;
  }>;
};

const buildInitialHomeImageUrls = () => {
  const map: Record<string, string> = {};
  const addEntry = (entry: WallpaperEntry, categorySlug: string) => {
    const firstImage = entry.item?.[0];
    const path = firstImage?.compressPath || firstImage?.originPath;
    const publicUrl = path ? buildPublicR2Url(path) : null;
    if (publicUrl) {
      map[`${categorySlug}::${entry.name}`] = publicUrl;
    }
  };

  getAllHomeCollections().forEach(({ category, collection }) => {
    addEntry(collection as WallpaperEntry, category);
  });

  return map;
};

export default async function HomePage() {
  const headerList = await headers();
  const userAgent = headerList.get('user-agent') || '';
  const isMobileRequest = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
  const initialImageUrls = buildInitialHomeImageUrls();
  return (
    <Home
      initialImageUrls={initialImageUrls}
      isMobilePriority={isMobileRequest}
      contentTabs={getTabData().filter((tab) => tab.type.toLowerCase() !== 'desktop')}
      contentCollectionsByCategory={getHomeCollectionsByCategory()}
      navigationTabsExtra={[{ title: 'Desktop', type: 'desktop', icon: '', items: [] }]}
    />
  );
}
