import { NextRequest, NextResponse } from 'next/server';
import { BRAND_CATEGORIES } from '@/lib/brands';
import { getWallpaperCollections } from '@/lib/wallpapers';

export const runtime = 'edge';

type WallpaperDeviceItem = {
  name: string;
  date: string;
  item: Array<{
    name: string;
    type: string;
    size: string;
    originPath: string;
    compressPath: string;
    tag: string;
  }>;
};

type DataSourceMap = Record<string, WallpaperDeviceItem[]>;

const dataSources: DataSourceMap = {
  ...Object.fromEntries(
    BRAND_CATEGORIES.map((brand) => [brand.slug, getWallpaperCollections(brand.slug)])
  ),
};

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

    const availableTypes = Object.keys(dataSources);

    if (type && !availableTypes.includes(type.toLowerCase())) {
      return NextResponse.json(
        {
          error: 'Invalid type parameter',
          availableTypes,
        },
        { status: 400 }
      );
    }

    const sourceEntries: Array<[string, WallpaperDeviceItem[]]> = type
      ? [[type.toLowerCase(), dataSources[type.toLowerCase()]]]
      : Object.entries(dataSources);

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

    return NextResponse.json({
      data: sliced,
      meta: {
        total,
        offset,
        limit: limit ?? null,
        type: type ?? null,
        device: device ?? null,
        availableTypes,
      },
    });
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
