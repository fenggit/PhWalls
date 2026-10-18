'use client';

import Link from 'next/link';
import type { Language } from '@/types';
import { fillDiscovery, getDiscoveryTexts, localizeWallpaperTag } from '@/lib/discovery-i18n';
import { themePathForTag } from '@/lib/wallpaper-themes';
import { trackAnalyticsEvent } from '@/lib/analytics';

export default function WallpaperTags({ tags = [], language, limit, dark = false, onMore }: {
  tags?: string[]; language: Language; limit?: number; dark?: boolean; onMore?: () => void;
}) {
  const unique = Array.from(new Set(tags.filter(Boolean)));
  if (!unique.length) return null;
  const shown = limit ? unique.slice(0, limit) : unique;
  const remaining = unique.length - shown.length;
  const style = `inline-flex min-h-7 items-center rounded-md px-2 py-1 text-xs ${dark
    ? 'bg-white/10 text-white/90' : 'bg-gray-100 text-gray-600'}`;
  return <div className="mt-2 flex flex-wrap gap-1.5" aria-label={getDiscoveryTexts(language).tags}>
    {shown.map(tag => {
      const href = themePathForTag(tag, language);
      return href ? <Link key={tag} href={href} prefetch={false}
        className={`${style} hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600`}
        onClick={() => trackAnalyticsEvent('wallpaper_theme_click', { tag, target: href })}>
        {localizeWallpaperTag(tag, language)}
      </Link> : <span key={tag} className={style}>{localizeWallpaperTag(tag, language)}</span>;
    })}
    {remaining > 0 && onMore && <button type="button" className={`${style} hover:underline`}
      onClick={onMore} aria-label={fillDiscovery(getDiscoveryTexts(language).moreTags, { count: remaining })}>+{remaining}</button>}
  </div>;
}
