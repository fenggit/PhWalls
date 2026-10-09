export const LIVE_WALLPAPERS_PATH = '/live-wallpapers';

export function buildLiveCategoryPath(category: string): string {
  return `${LIVE_WALLPAPERS_PATH}/${category}`;
}
