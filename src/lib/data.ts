import type { Language, TabInfo } from '@/types';
import { DEFAULT_LANGUAGE } from '@/lib/language';
import tabDataEn from '@/data/language/en/tab.json';
import tabDataZh from '@/data/language/zh/tab.json';
import tabDataJa from '@/data/language/ja/tab.json';
import tabDataVi from '@/data/language/vi/tab.json';
import tabDataZhHant from '@/data/language/zh-hant/tab.json';

const TAB_DATA_BY_LANGUAGE: Record<Language, TabInfo[]> = {
  en: tabDataEn as TabInfo[],
  zh: tabDataZh as TabInfo[],
  ja: tabDataJa as TabInfo[],
  vi: tabDataVi as TabInfo[],
  'zh-hant': tabDataZhHant as TabInfo[],
};

// 获取导航数据
export const getTabData = (language: Language = DEFAULT_LANGUAGE): TabInfo[] => {
  return TAB_DATA_BY_LANGUAGE[language] || TAB_DATA_BY_LANGUAGE[DEFAULT_LANGUAGE];
};

const escapeRegExp = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const buildWallpaperListTitle = (title: string, wallpapersSuffix: string): string => {
  const suffix = String(wallpapersSuffix || 'Wallpapers').trim();
  const suffixPatterns = [
    /\s*wallpapers\s*$/i,
    suffix ? new RegExp(`\\s*${escapeRegExp(suffix)}\\s*$`, 'i') : null,
  ].filter(Boolean) as RegExp[];

  const baseTitle = suffixPatterns.reduce(
    (acc, pattern) => acc.replace(pattern, '').trim(),
    String(title || '').trim(),
  );

  if (!baseTitle) {
    return suffix;
  }

  if (!suffix) {
    return baseTitle;
  }

  return `${baseTitle} ${suffix}`;
};

type DateSortableItem = {
  date?: string | number | null;
};

const toDateScore = (value: DateSortableItem['date']): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== 'string') {
    return Number.NEGATIVE_INFINITY;
  }

  const raw = value.trim();
  if (!raw) {
    return Number.NEGATIVE_INFINITY;
  }

  if (/^\d{4}$/.test(raw)) {
    const year = Number(raw);
    return Date.UTC(year, 11, 31);
  }

  if (/^\d{4}\/\d{1,2}$/.test(raw)) {
    const [year, month] = raw.split('/').map(Number);
    return Date.UTC(year, month - 1, 1);
  }

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(raw)) {
    const normalized = raw.replace(/-/g, '/');
    const [year, month, day] = normalized.split('/').map(Number);
    return Date.UTC(year, month - 1, day);
  }

  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }

  return Number.NEGATIVE_INFINITY;
};

export const sortByDateDesc = <T extends DateSortableItem>(items: T[]): T[] => {
  return [...items].sort((a, b) => {
    const scoreDiff = toDateScore(b.date) - toDateScore(a.date);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return String(b.date ?? '').localeCompare(String(a.date ?? ''), undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  });
};
