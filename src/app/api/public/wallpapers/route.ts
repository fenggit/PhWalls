import { NextRequest, NextResponse } from 'next/server';
import { BRAND_CATEGORIES } from '@/lib/brands';
import { WALLPAPER_LIST_CACHE_CONTROL } from '@/lib/cache-control';
import {
  loadWallpaperCollections,
  type WallpaperCollection,
} from '@/lib/wallpaper-data';

export const runtime = 'edge';

const availableTypes = BRAND_CATEGORIES.map((brand) => brand.slug);

const normalize = (value: string) => value.replace(/\s+/g, '').toLowerCase();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const device = searchParams.get('device');
    const offsetRaw = Number(searchParams.get('offset') || 0);
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, offsetRaw) : 0;
    const limitParam = searchParams.get('limit');
    const limitRaw = limitParam ? Number(limitParam) : undefined;
    const limit = typeof limitRaw === 'number' && Number.isFinite(limitRaw)
      ? Math.max(1, limitRaw)
      : undefined;

    const normalizedType = type?.toLowerCase() || null;

    if (normalizedType && !availableTypes.includes(normalizedType)) {
      return NextResponse.json(
        {
          error: 'Invalid type parameter',
          availableTypes,
        },
        { status: 400 }
      );
    }

    // 首页预览始终携带 type，只加载对应品牌 JSON；无 type 时保留原有全量公开 API 行为。
    const sourceEntries: Array<[string, WallpaperCollection[]]> = normalizedType
      ? [[normalizedType, await loadWallpaperCollections(normalizedType)]]
      : await Promise.all(
          availableTypes.map(async (sourceType) => [
            sourceType,
            await loadWallpaperCollections(sourceType),
          ] as [string, WallpaperCollection[]])
        );

    const normalizedDevice = device ? normalize(device) : null;
    const results = sourceEntries.flatMap(([sourceType, list]) =>
      list
        .filter((deviceItem) => !normalizedDevice || normalize(deviceItem.name) === normalizedDevice)
        .map((deviceItem) => ({
          ...deviceItem,
          sourceType,
        }))
    );

    const total = results.length;
    const sliced = limit ? results.slice(offset, offset + limit) : results.slice(offset);

    return NextResponse.json(
      {
        data: sliced,
        meta: {
          total,
          offset,
          limit: limit ?? null,
          type: type ?? null,
          device: device ?? null,
          availableTypes,
        },
      },
      {
        headers: {
          'Cache-Control': WALLPAPER_LIST_CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    console.error('Error fetching wallpapers:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch wallpaper list',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
