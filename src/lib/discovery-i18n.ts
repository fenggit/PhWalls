import en from '@/data/language/en/discovery.json';
import zh from '@/data/language/zh/discovery.json';
import ja from '@/data/language/ja/discovery.json';
import vi from '@/data/language/vi/discovery.json';
import hant from '@/data/language/zh-hant/discovery.json';
import enTags from '@/data/language/en/wallpaper-tags.json';
import zhTags from '@/data/language/zh/wallpaper-tags.json';
import jaTags from '@/data/language/ja/wallpaper-tags.json';
import viTags from '@/data/language/vi/wallpaper-tags.json';
import hantTags from '@/data/language/zh-hant/wallpaper-tags.json';
import type { Language } from '@/types';

const copy: Record<Language, typeof en> = { en, zh, ja, vi, 'zh-hant': hant };
const tags: Record<Language, Record<string, string>> = { en: enTags, zh: zhTags, ja: jaTags, vi: viTags, 'zh-hant': hantTags };
export const getDiscoveryTexts = (language: Language) => copy[language];
export const localizeWallpaperTag = (tag: string, language: Language) => tags[language][tag] || tag;
export function fillDiscovery(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}
