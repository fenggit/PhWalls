import 'server-only';
import type { Language } from '@/types';
import { getDeviceDisplayName } from '@/lib/device-brand-label';
import { sortByDateDesc } from '@/lib/data';
import { getLiveTabData } from '@/lib/live-data';
import { isWallpaperDbEnabled, loadDbCollection, loadDbCollections, loadDbIndex } from '@/lib/wallpaper-db';
import type { WallpaperCollection } from '@/lib/wallpaper-data';

export type LiveCatalogEntry = { category: string; status: string; collection: WallpaperCollection };

async function loadJsonCollections(category: string, language: Language): Promise<WallpaperCollection[]> {
  const catalog = (await import('@/data/livewalls/catalog.json')).default as LiveCatalogEntry[];
  return sortByDateDesc(catalog.filter((entry) => entry.category === category && entry.status === 'published')
    .map(({ collection }) => ({ ...collection, name: getDeviceDisplayName(category, collection.name, language) })));
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
    (await loadJsonCollections(tab.type, language)).map((collection) => ({
      ...collection, count: collection.item.length, item: collection.item.slice(0, 1),
    })),
  ])));
}
