import { getWallpaperDb, type DeviceRow, type WallpaperMediaType, type WallpaperRow } from '@/lib/wallpaper-db';
import { getAdminUploadDirectories, normalizeAdminR2Prefix } from '@/lib/admin-upload-path';
import { findAdminBrand } from '@/lib/admin-brands';
import { getI18nTexts } from '@/lib/i18n';

async function getLiveBrandDirectory(brand: string): Promise<string> {
  // Live 历史品牌目录不是 URL slug；Google、REDMAGIC 等也有独立的存储命名。
  const catalog = (await import('@/data/livewalls/catalog.json')).default;
  const historical = catalog.find((entry) => entry.category === brand)?.collection.item
    .find((item) => item.originPath.startsWith('live/'))?.originPath.split('/')[1];
  const candidate = historical || (await findAdminBrand(brand))?.title || brand;
  try { if (!candidate.includes('/')) return normalizeAdminR2Prefix(candidate); }
  catch { /* 无效品牌显示名不能成为存储目录。 */ }
  return brand;
}

export async function getAdminUploadStorage(device: DeviceRow, media: WallpaperMediaType) {
  const { results } = await getWallpaperDb().prepare(
    "SELECT media_type, origin_key FROM w_wallpapers WHERE device_id = ? AND deletion_state = 'none'"
  ).bind(device.id).all<Pick<WallpaperRow, 'media_type' | 'origin_key'>>();
  const liveBrandDirectory = await getLiveBrandDirectory(device.brand_name);
  return {
    ...getAdminUploadDirectories(device, media, results, liveBrandDirectory),
    otherDirectories: getAdminUploadDirectories(device, media === 'dynamic' ? 'static' : 'dynamic', results, liveBrandDirectory).directories,
    liveBrandDirectory,
  };
}

export async function resolveAdminUploadStorage(device: DeviceRow, media: WallpaperMediaType, input: Record<string, unknown>) {
  const storage = await getAdminUploadStorage(device, media);
  const target = input.r2_prefix === undefined ? storage.prefix : normalizeAdminR2Prefix(input.r2_prefix);
  if (!target) throw new Error('该类型已有多个 R2 目录，请先选择上传目录');
  if (input.path_mode !== undefined && input.path_mode !== 'device' && input.path_mode !== 'custom') throw new Error('目录方式无效');
  if (input.path_mode === 'device' && !(storage.directories.length ? storage.directories : [storage.prefix]).includes(target)) {
    throw new Error('设备目录已变化，请重新选择上传目标');
  }
  if (storage.otherDirectories.includes(target) && !storage.directories.includes(target)) {
    throw new Error('所选目录属于该设备的另一种壁纸类型，请重新选择');
  }
  // 兼容已经入库的历史路径；新目录必须按静态与 Live 分开。
  if (!storage.directories.includes(target) && /^live\//i.test(target) !== (media === 'dynamic')) {
    throw new Error('动态壁纸须存入 live/ 目录，静态壁纸须选择 live/ 以外的目录');
  }
  if (media === 'dynamic' && !storage.directories.includes(target)) {
    const [root, brandFolder] = target.split('/');
    if (root !== 'live' || (brandFolder.toLowerCase() === storage.liveBrandDirectory.toLowerCase() && brandFolder !== storage.liveBrandDirectory)) {
      throw new Error(getI18nTexts('zh').adminUploadBrandDirectoryCase.replace('{path}', `live/${storage.liveBrandDirectory}/`));
    }
  }
  return target;
}
