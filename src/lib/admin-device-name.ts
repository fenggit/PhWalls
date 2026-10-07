import { normalizeAdminName } from '@/lib/admin-identity';
import { slugifyWallpaperName } from '@/lib/wallpaper-data';
import { getI18nTexts } from '@/lib/i18n';
import type { DeviceRow } from '@/lib/wallpaper-db';

const nonNameCharacters = new RegExp('[^\\p{L}\\p{N}]', 'gu');
const texts = getI18nTexts('zh');

export type AdminDeviceNameCandidate = Pick<DeviceRow, 'id' | 'device_name' | 'device_slug'>;
export type AdminDeviceNameCheck = {
  kind: 'available' | 'duplicate' | 'slug' | 'similar';
  matches: AdminDeviceNameCandidate[];
};

export class AdminDeviceNameConflictError extends Error {
  constructor(public readonly conflict: AdminDeviceNameCheck, message?: string) {
    const names = conflict.matches.map((device) => `“${device.device_name}”`).join('、');
    super(message || `${conflict.kind === 'similar' ? texts.adminNameSimilarError
      : conflict.kind === 'slug' ? texts.adminNameSlugError : texts.adminNameDuplicateError}${names}`);
  }
}

// Bounded edit distance, including adjacent transpositions, for short model-name typos.
function withinEditDistance(left: string, right: string, limit: number): boolean {
  const a = Array.from(left);
  const b = Array.from(right);
  if (Math.abs(a.length - b.length) > limit) return false;
  let previous = b.map((_, index) => index + 1);
  previous.unshift(0);
  let beforePrevious = previous;
  for (let i = 1; i <= a.length; i++) {
    const current = new Array<number>(b.length + 1).fill(limit + 1);
    current[0] = i;
    let minimum = current[0];
    for (let j = Math.max(1, i - limit); j <= Math.min(b.length, i + limit); j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        current[j] = Math.min(current[j], beforePrevious[j - 2] + 1);
      }
      minimum = Math.min(minimum, current[j]);
    }
    if (minimum > limit) return false;
    beforePrevious = previous;
    previous = current;
  }
  return previous[b.length] <= limit;
}

function similarNames(left: string, right: string): boolean {
  const compact = (value: string) => value.replace(nonNameCharacters, '');
  const a = compact(left);
  const b = compact(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const shortest = Math.min(a.length, b.length);
  const longest = Math.max(a.length, b.length);
  if (shortest >= 4 && shortest / longest >= 0.5 && (a.startsWith(b) || b.startsWith(a))) return true;
  if (shortest < 4) return false;
  return withinEditDistance(a, b, Math.max(1, Math.min(3, Math.floor(longest * 0.15))));
}

export function checkAdminDeviceNames(name: string, devices: AdminDeviceNameCandidate[]): AdminDeviceNameCheck {
  const key = normalizeAdminName(name);
  if (!key) return { kind: 'available', matches: [] };
  const duplicates = devices.filter((device) => normalizeAdminName(device.device_name) === key);
  if (duplicates.length) return { kind: 'duplicate', matches: duplicates };
  const slug = slugifyWallpaperName(key);
  const collisions = devices.filter((device) => slug && device.device_slug === slug);
  if (collisions.length) return { kind: 'slug', matches: collisions };
  const matches = devices.filter((device) => similarNames(key, normalizeAdminName(device.device_name)));
  return { kind: matches.length ? 'similar' : 'available', matches };
}

export async function createWithAdminNameConfirmation<T>(
  input: Record<string, unknown>, create: (input: Record<string, unknown>) => Promise<T>,
  confirm: (message: string) => boolean,
): Promise<T | null> {
  try {
    return await create(input);
  } catch (error) {
    if (!(error instanceof AdminDeviceNameConflictError) || error.conflict.kind !== 'similar') throw error;
    if (!confirm(`${error.message}\n\n${texts.adminNameConfirmCreate.replace('{name}', String(input.device_name))}`)) return null;
    return create({ ...input, confirmed_similar_ids: error.conflict.matches.map((device) => device.id) });
  }
}
