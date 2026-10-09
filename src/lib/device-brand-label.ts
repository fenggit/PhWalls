import localization from '@/data/device-localization.json';
import type { Language } from '@/types';

const profiles = localization as Record<string, {
  titles: Record<Language, string>;
  names: Record<Language, string>;
  prefixes: string[];
  special_prefixes?: Array<{ from: string; names: Record<Language, string> }>;
}>;

export function getDeviceBrandLabel(brand: string, language: Language, fallback: string): string {
  return profiles[brand]?.titles[language] || fallback;
}

export function getDeviceDisplayName(brand: string, name: string, language: Language): string {
  const profile = profiles[brand];
  if (!profile) return name;
  const rules = [...(profile.special_prefixes || []), ...profile.prefixes.map((from) => ({ from, names: profile.names }))]
    .sort((left, right) => right.from.length - left.from.length);
  const rule = rules.find(({ from }) => name.toLowerCase().startsWith(from.toLowerCase()) &&
    !/[a-z0-9]/i.test(name.charAt(from.length)));
  return rule ? `${rule.names[language] || rule.from}${name.slice(rule.from.length)}` : name;
}
