import Home from './Home';
import { headers } from 'next/headers';
import { getAllWallpaperCollections } from '@/lib/wallpapers';

type WallpaperEntry = {
  name: string;
  item?: Array<{
    compressPath?: string;
    originPath?: string;
  }>;
};

const buildInitialHomeImageUrls = () => {
  const cdnBaseUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_CDN_URL;
  if (!cdnBaseUrl) return {};

  const map: Record<string, string> = {};
  const addEntry = (entry: WallpaperEntry, categorySlug: string) => {
    const firstImage = entry.item?.[0];
    const path = firstImage?.compressPath || firstImage?.originPath;
    if (path && path.includes('/compress/')) {
      map[`${categorySlug}::${entry.name}`] = `${cdnBaseUrl}/${path}`;
    }
  };

  getAllWallpaperCollections().forEach(({ category, collection }) => {
    addEntry(collection as WallpaperEntry, category);
  });

  return map;
};

export default async function HomePage() {
  const headerList = await headers();
  const userAgent = headerList.get('user-agent') || '';
  const isMobileRequest = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
  const initialImageUrls = buildInitialHomeImageUrls();
  return <Home initialImageUrls={initialImageUrls} isMobilePriority={isMobileRequest} />;
}
