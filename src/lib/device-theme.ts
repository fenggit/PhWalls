/** Stable, language-independent keys for a device collection's main visual style. */
export const DEVICE_THEMES = [
  'dark', 'gradient', 'minimal_geometric', 'anime', 'abstract',
  'nature', 'photography', 'floral', 'technology', 'illustration',
] as const;

export type DeviceTheme = typeof DEVICE_THEMES[number];

export const DEVICE_THEME_LABEL_KEYS = {
  dark: 'deviceThemeDark', gradient: 'deviceThemeGradient', minimal_geometric: 'deviceThemeMinimalGeometric',
  anime: 'deviceThemeAnime', abstract: 'deviceThemeAbstract', nature: 'deviceThemeNature',
  photography: 'deviceThemePhotography', floral: 'deviceThemeFloral', technology: 'deviceThemeTechnology',
  illustration: 'deviceThemeIllustration',
} as const satisfies Record<DeviceTheme, string>;
