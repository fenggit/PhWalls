import type { WallpaperMediaType } from '@/lib/wallpaper-db';
import type { WallpaperCollection } from '@/lib/wallpaper-data';
import { isVideoWallpaper } from '@/lib/data';

type CollectionIdentity = {
  deviceId?: string;
  slug?: string;
  name: string;
  mediaType?: WallpaperMediaType;
  item?: Array<{ type?: string; originPath?: string }>;
};

export function getWallpaperCollectionMedia(collection: Pick<CollectionIdentity, 'mediaType' | 'item'>): WallpaperMediaType {
  return collection.mediaType || (isVideoWallpaper(collection.item?.[0]) ? 'dynamic' : 'static');
}

export function buildWallpaperCollectionKey(category: string, collection: CollectionIdentity): string {
  return `${category}::${collection.deviceId || collection.slug || collection.name}::${getWallpaperCollectionMedia(collection)}`;
}

export function splitWallpaperCollection(collection: WallpaperCollection): WallpaperCollection[] {
  return (['static', 'dynamic'] as const).flatMap((mediaType) => {
    const item = collection.item.filter((asset) => isVideoWallpaper(asset) === (mediaType === 'dynamic'));
    return item.length ? [{ ...collection, mediaType, item, count: item.length }] : [];
  });
}

export function parseWallpaperMedia(value: unknown, fallback: WallpaperMediaType = 'static'): WallpaperMediaType {
  if (value === undefined || value === null || value === '') return fallback;
  if (value !== 'static' && value !== 'dynamic') throw new Error('媒体类型无效');
  return value;
}
