import type { AdminDeviceListRow, WallpaperMediaType } from '@/lib/wallpaper-db';

export type AdminDeviceCollectionRow = AdminDeviceListRow & {
  media_type: WallpaperMediaType | null;
  collection_count: number;
  collection_deletion_state: AdminDeviceListRow['deletion_state'];
};

export function listAdminDeviceCollectionRows(devices: AdminDeviceListRow[], mediaFilter = ''): AdminDeviceCollectionRow[] {
  return devices.flatMap<AdminDeviceCollectionRow>((device) => {
    // Keep old interrupted whole-device deletions available for their original retry flow.
    if (device.deletion_state !== 'none') return [{ ...device, media_type: null,
      collection_count: device.wallpaper_count, collection_deletion_state: device.deletion_state }];
    if (!device.wallpaper_count) return !mediaFilter || mediaFilter === 'empty'
      ? [{ ...device, media_type: null, collection_count: 0, collection_deletion_state: 'none' }] : [];
    return (['static', 'dynamic'] as const).flatMap((media) => {
      const count = media === 'static' ? device.static_count : device.dynamic_count;
      if (!count || (mediaFilter && mediaFilter !== media)) return [];
      return [{ ...device, media_type: media, collection_count: count,
        collection_deletion_state: (media === 'static' ? device.static_deletion_state : device.dynamic_deletion_state) || 'none' }];
    });
  });
}
