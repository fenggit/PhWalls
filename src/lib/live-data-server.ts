import 'server-only';
import type { Language } from '@/types';
import { getLiveTabData } from '@/lib/live-data';
import { loadDbCollection, loadDbCollections, loadDbIndex } from '@/lib/wallpaper-db';
import type { WallpaperCollection } from '@/lib/wallpaper-data';

export async function loadLiveCollections(category: string, language: Language = 'en') {
  return loadDbCollections(category, language, 'dynamic');
}

export async function loadLiveCollection(category: string, slug: string, language: Language = 'en') {
  return loadDbCollection(category, slug, language, 'dynamic');
}

export async function loadLiveIndex(language: Language = 'en'): Promise<Record<string, WallpaperCollection[]>> {
  return loadDbIndex(getLiveTabData(language).map((tab) => tab.type), language, 'dynamic');
}
