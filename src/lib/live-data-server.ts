import 'server-only';
import type { Language } from '@/types';
import { getDeviceDisplayName } from '@/lib/device-brand-label';
import { sortByDateDesc } from '@/lib/data';
import { getLiveTabData } from '@/lib/live-data';
import { isWallpaperDbEnabled, loadDbCollection, loadDbCollections, loadDbIndex } from '@/lib/wallpaper-db';
import { loadWallpaperCollections as loadLegacyCollections, slugifyWallpaperName, type WallpaperCollection } from '@/lib/wallpaper-data';
import { getWallpaperCollectionMedia, splitWallpaperCollection } from '@/lib/wallpaper-media';
import homeIndex from '@/data/home-index.json';

export type LiveCatalogEntry = { category: string; status: string; collection: WallpaperCollection };

async function loadJsonCollections(category: string, language: Language, indexOnly = false): Promise<WallpaperCollection[]> {
  const catalog = (await import('@/data/livewalls/catalog.json')).default as LiveCatalogEntry[];
  const categoryEntries = catalog.filter((entry) => entry.category === category);
  const reservedSlugs = new Set(categoryEntries.map(({ collection }) => collection.slug || slugifyWallpaperName(collection.name)));
  const canonical = categoryEntries.filter((entry) => entry.status === 'published')
    .flatMap(({ collection }) => splitWallpaperCollection(collection))
    .filter((collection) => collection.mediaType === 'dynamic');
  const legacy = indexOnly
    ? (homeIndex as unknown as Record<string, WallpaperCollection[]>)[category] || []
    : (await loadLegacyCollections(category)).flatMap(splitWallpaperCollection);
  const additional = legacy.filter((collection) => getWallpaperCollectionMedia(collection) === 'dynamic'
    && !reservedSlugs.has(collection.slug || slugifyWallpaperName(collection.name)));
  return sortByDateDesc([...canonical, ...additional].map((collection) => ({
    ...collection, mediaType: 'dynamic', slug: collection.slug || slugifyWallpaperName(collection.name),
    name: getDeviceDisplayName(category, collection.name, language),
  })));
}

export async function loadLiveCollections(category: string, language: Language = 'en') {
  return isWallpaperDbEnabled() ? loadDbCollections(category, language, 'dynamic') : loadJsonCollections(category, language);
}

export async function loadLiveCollection(category: string, slug: string, language: Language = 'en') {
  if (isWallpaperDbEnabled()) return loadDbCollection(category, slug, language, 'dynamic');
  return (await loadJsonCollections(category, language)).find((collection) => collection.slug === slug) || null;
}

export async function loadLiveIndex(language: Language = 'en'): Promise<Record<string, WallpaperCollection[]>> {
  const tabs = getLiveTabData(language);
  if (isWallpaperDbEnabled()) return loadDbIndex(tabs.map((tab) => tab.type), language, 'dynamic');
  return Object.fromEntries(await Promise.all(tabs.map(async (tab) => [tab.type,
    (await loadJsonCollections(tab.type, language, true)).map((collection) => ({
      ...collection, count: collection.count ?? collection.item.length, item: collection.item.slice(0, 1),
    })),
  ])));
}
