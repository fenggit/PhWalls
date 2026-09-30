import HomeLanding from './HomeLanding';
import desktopHomeIndex from '@/data/desktop-home-index.json';
import { BRAND_CATEGORIES } from '@/lib/brands';
import { selectRecentCollections } from '@/lib/home-curation';
import { getHomeCollectionsByCategory } from '@/lib/home-index';
import { isHomeCategoryVisible } from '@/lib/home-priority';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import { buildDesktopWallpaperDetailPath } from '@/lib/desktop-data';
import {
  buildWallpaperDetailPath,
  type WallpaperCollectionEntry,
} from '@/lib/wallpaper-data';

const POPULAR_BRANDS = [
  'samsung', 'xiaomi', 'huawei', 'google-pixel',
  'oppo', 'vivo', 'honor', 'motorola',
] as const;

const FEATURED_DESKTOP_CATEGORIES = [
  'microsoft-windows',
  'microsoft-surface',
  'ubuntu',
] as const;

export default function HomePage() {
  const collectionsByCategory = getHomeCollectionsByCategory();
  const now = new Date();
  const phoneCategories = BRAND_CATEGORIES
    .map((brand) => brand.slug)
    .filter((slug) => isHomeCategoryVisible(slug) && slug !== 'android');

  const latest = selectRecentCollections(
    collectionsByCategory,
    phoneCategories,
    8,
    now
  );
  const toPhoneCard = ({ category, collection }: WallpaperCollectionEntry) => ({
    category,
    name: collection.name,
    date: collection.date,
    count: collection.count || collection.item?.length || 0,
    href: buildWallpaperDetailPath(category, collection.name),
    imageUrl: buildPublicR2Url(collection.item?.[0]?.compressPath || collection.item?.[0]?.originPath || ''),
  });

  const popular = POPULAR_BRANDS.map((category) => ({
    category,
    cards: selectRecentCollections(collectionsByCategory, [category], 6, now, 6)
      .map(toPhoneCard),
  }));

  const desktop = FEATURED_DESKTOP_CATEGORIES.flatMap((category) =>
    desktopHomeIndex[category].map((collection) => ({
      category,
      name: collection.name,
      href: buildDesktopWallpaperDetailPath(category, collection.name),
      imageUrl: buildPublicR2Url(collection.item?.[0]?.compressPath || collection.item?.[0]?.originPath || ''),
    }))
  );

  return <HomeLanding latest={latest.map(toPhoneCard)} popular={popular} desktop={desktop} />;
}
