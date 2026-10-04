import { readFileSync } from 'node:fs';

export const deviceLocalization = JSON.parse(readFileSync(new URL('../src/data/device-localization.json', import.meta.url), 'utf8'));
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function localizeDeviceName(brand, name, language) {
  const normalized = name.trim().replace(/\s+wallpapers$/i, '').replace(/\s+/g, ' ');
  const profile = deviceLocalization[brand];
  if (!profile) return normalized;
  const replacements = [
    ...(profile.special_prefixes || []),
    ...profile.prefixes.map((from) => ({ from, names: profile.names })),
  ].sort((left, right) => right.from.length - left.from.length);
  for (const rule of replacements) {
    const pattern = new RegExp(`^${escapePattern(rule.from)}(?=$|[^a-z0-9])`, 'i');
    if (pattern.test(normalized)) return normalized.replace(pattern, rule.names[language] || rule.from);
  }
  return normalized;
}

export function localizeDeviceText(device, text, language) {
  if (text === null || text === undefined) return null;
  const source = device.device_name.trim().replace(/\s+wallpapers$/i, '').replace(/\s+/g, ' ');
  const target = localizeDeviceName(device.brand_name, source, language);
  // Match an already localized phrase first, including names containing the original
  // phrase (e.g. "摩托罗拉 Moto E20"), so repeated repairs cannot duplicate its prefix.
  const variants = new Set([target, source]);
  // Earlier copy sometimes translated only the manufacturer ("华为 Enjoy 70X").
  // Recognize every known rendering of the same complete model, including that
  // partial form, instead of changing arbitrary brand words elsewhere in prose.
  for (const profile of Object.values(deviceLocalization)) {
    const rules = [...(profile.special_prefixes || []), ...profile.prefixes.map(from => ({ from, names: profile.names }))];
    for (const rule of rules) {
      const prefix = new RegExp(`^${escapePattern(rule.from)}(?=$|[^a-z0-9])`, 'i');
      if (prefix.test(source)) {
        for (const name of Object.values(rule.names)) variants.add(source.replace(prefix, name));
      }
    }
  }
  const phrases = [...variants].sort((left, right) => right.length - left.length);
  const pattern = new RegExp(`(?<![a-z0-9_])(?:${phrases.map(escapePattern).join('|')})(?![a-z0-9_])`, 'gi');
  return text.replace(pattern, target);
}
