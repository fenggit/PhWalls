import type { WallpaperAsset } from '@/lib/wallpaper-data';
import type { DeviceTheme } from '@/lib/device-theme';
import { DEVICE_THEME_LABEL_KEYS } from '@/lib/device-theme';
import type { Language } from '@/types';
import { withLanguagePath } from '@/lib/language';
import { getI18nTexts } from '@/lib/i18n';
import { getDiscoveryTexts, fillDiscovery } from '@/lib/discovery-i18n';

export type WallpaperTheme = {
  key: DeviceTheme; slug: string; title: string; description: string;
  anyTags: string[]; allTags?: string[]; linkTags: string[];
};

// Exactly ten editorial destinations. Tags and filter combinations never create routes.
export const WALLPAPER_THEMES: WallpaperTheme[] = [
  { key: 'dark', slug: 'dark', title: 'Dark Wallpapers', anyTags: [], linkTags: [],
    description: 'Deep backgrounds, subdued light and dark abstract forms from stock wallpaper collections. Compare the shadows and details before choosing a background for your screen.' },
  { key: 'gradient', slug: 'gradient', title: 'Gradient Wallpapers', anyTags: ['gradient'], linkTags: ['gradient'],
    description: 'Smooth color transitions from phone and desktop stock collections. Explore soft pastel blends, richer color fields and flowing gradients, with original dimensions shown on every image.' },
  { key: 'minimal_geometric', slug: 'minimal-geometric', title: 'Minimal Geometric Wallpapers', anyTags: ['geometric'], linkTags: ['geometric'],
    description: 'Simple geometric shapes with room for your icons. This selection focuses on pared-back circles, planes and lines rather than busy patterns or detailed scenes.' },
  { key: 'anime', slug: 'anime', title: 'Anime Wallpapers', anyTags: ['anime'], linkTags: ['anime'],
    description: 'Anime-style characters and illustrated scenes found in stock wallpaper collections. Browse the artwork, check the original dimensions and follow each source to explore its complete collection.' },
  { key: 'abstract', slug: 'abstract', title: 'Abstract Wallpapers', anyTags: ['abstract'], linkTags: ['abstract', 'fluid art'],
    description: 'Sculptural forms, fluid surfaces and expressive color from original stock collections. Explore abstract images chosen for their composition and the way they work behind home-screen icons.' },
  { key: 'nature', slug: 'nature', title: 'Nature Wallpapers', anyTags: ['natural landscapes', 'mountains', 'forest', 'ocean', 'lakes & rivers'], linkTags: ['natural landscapes', 'mountains', 'forest', 'ocean', 'lakes & rivers'],
    description: 'Mountains, coastlines and quiet natural scenes from phone and desktop collections. Match the landscape or portrait composition to your display and download the original image from the preview.' },
  { key: 'photography', slug: 'photography', title: 'Photography Wallpapers', anyTags: ['photography'], linkTags: ['photography'],
    description: 'Photographic stock wallpapers featuring real places, textures and details. Compare subjects and lighting, then check each image’s orientation and original size before setting it as your background.' },
  { key: 'floral', slug: 'floral', title: 'Flower and Botanical Wallpapers', anyTags: ['flowers', 'plants', 'petals'], linkTags: ['flowers', 'plants', 'petals'],
    description: 'Flowers, foliage and petal-inspired compositions from stock wallpaper collections. The selection brings together botanical photographs and stylized floral forms, with links to their original device collections.' },
  { key: 'technology', slug: 'technology', title: 'Futuristic Technology Wallpapers', anyTags: ['technology', 'mechanical', 'science fiction'], linkTags: ['technology', 'mechanical', 'science fiction'],
    description: 'Mechanical detail, digital forms and futuristic scenes from existing stock collections. Choose a technology-inspired background by its composition and original dimensions, rather than by device brand alone.' },
  { key: 'illustration', slug: 'illustration', title: 'Illustration Wallpapers', anyTags: ['illustration'], linkTags: ['illustration'],
    description: 'Drawn landscapes, graphic scenes and playful illustrations from stock collections. Explore different drawing styles and follow the source links to find more images from the same collection.' },
];

export const getWallpaperTheme = (slug: string) => WALLPAPER_THEMES.find(theme => theme.slug === slug) || null;
const RELATED_THEMES: Record<DeviceTheme, DeviceTheme[]> = {
  dark: ['technology', 'abstract', 'gradient'],
  gradient: ['minimal_geometric', 'abstract', 'floral'],
  minimal_geometric: ['gradient', 'abstract', 'dark'],
  anime: ['illustration', 'technology', 'abstract'],
  abstract: ['gradient', 'minimal_geometric', 'floral'],
  nature: ['photography', 'floral', 'illustration'],
  photography: ['nature', 'floral', 'dark'],
  floral: ['nature', 'photography', 'abstract'],
  technology: ['dark', 'abstract', 'anime'],
  illustration: ['anime', 'abstract', 'nature'],
};
export const getRelatedWallpaperThemes = (theme: WallpaperTheme) => RELATED_THEMES[theme.key]
  .map(key => WALLPAPER_THEMES.find(item => item.key === key)!);
export const themePath = (theme: WallpaperTheme, language: Language = 'en') => withLanguagePath(`/themes/${theme.slug}`, language);
export function getWallpaperThemeCopy(theme: WallpaperTheme, language: Language) {
  const texts = getDiscoveryTexts(language);
  return {
    title: language === 'en' ? theme.title : fillDiscovery(texts.themeTitle, { theme: getI18nTexts(language)[DEVICE_THEME_LABEL_KEYS[theme.key]] }),
    description: texts.themeDescriptions[theme.key],
  };
}
export function themePathForTag(tag: string, language: Language = 'en'): string | null {
  const theme = WALLPAPER_THEMES.find(theme => theme.linkTags.includes(tag));
  return theme ? themePath(theme, language) : null;
}
export function matchesTheme(theme: WallpaperTheme, item: Pick<WallpaperAsset, 'type' | 'tags'>): boolean {
  if (!item.type.startsWith('image/')) return false;
  const tags = item.tags || [];
  if (theme.allTags) return theme.allTags.every(tag => tags.includes(tag));
  return !theme.anyTags.length || theme.anyTags.some(tag => tags.includes(tag));
}
