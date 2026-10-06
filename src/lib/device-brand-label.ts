import localization from '@/data/device-localization.json';
import type { Language } from '@/types';

const profiles = localization as Record<string, { titles: Record<Language, string> }>;

export function getDeviceBrandLabel(brand: string, language: Language, fallback: string): string {
  return profiles[brand]?.titles[language] || fallback;
}
