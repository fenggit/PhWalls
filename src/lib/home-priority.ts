import type { TabInfo } from '@/types';
import { normalizeCategoryType } from '@/lib/brands';

// Keep the highest-demand owned categories visible before lower-demand and external links.
const HOME_CATEGORY_PRIORITY = [
  'samsung',
  'transsion-infinix',
  'motorola',
  'oppo',
  'transsion-tecno',
  'honor',
  'xiaomi',
  'huawei',
  'vivo',
  'realme',
  'google-pixel',
  'nothing',
  'oneplus',
  'redmi',
  'poco',
  'iqoo',
  'android',
  'sony',
] as const;

const HOME_CATEGORY_RANK = new Map<string, number>(
  HOME_CATEGORY_PRIORITY.map((type, index) => [type, index])
);

export function sortHomeTabsByPriority(tabs: TabInfo[]): TabInfo[] {
  return tabs
    .map((tab, index) => ({ tab, index }))
    .sort((left, right) => {
      const leftRank = HOME_CATEGORY_RANK.get(normalizeCategoryType(left.tab.type));
      const rightRank = HOME_CATEGORY_RANK.get(normalizeCategoryType(right.tab.type));
      const resolvedLeftRank = leftRank ?? Number.MAX_SAFE_INTEGER;
      const resolvedRightRank = rightRank ?? Number.MAX_SAFE_INTEGER;

      return resolvedLeftRank - resolvedRightRank || left.index - right.index;
    })
    .map(({ tab }) => tab);
}
