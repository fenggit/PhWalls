'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import WallpaperPreviewDownload from '@/components/WallpaperPreviewDownload';
import WallpaperTags from '@/components/WallpaperTags';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import { wallpaperResolution } from '@/lib/collection-intro';
import { formatWallpaperDisplayName } from '@/lib/data';
import { withLanguagePath } from '@/lib/language';
import type { ThemeWallpaper } from '@/lib/wallpaper-theme-db';
import { analyticsAttributes, getWallpaperAnalyticsParams, trackAnalyticsEvent } from '@/lib/analytics';
import type { Language } from '@/types';
import { getI18nTexts } from '@/lib/i18n';
import { Scan } from 'lucide-react';

export default function ThemeWallpaperGallery({ wallpapers, title, language, themeSlug }: { wallpapers: ThemeWallpaper[]; title: string; language: Language; themeSlug: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const analyticsContext = useMemo(() => ({ theme_slug: themeSlug, entry_point: 'theme_gallery' }), [themeSlug]);
  const open = (position: number) => {
    setIndex(position);
    trackAnalyticsEvent('theme_wallpaper_preview', { ...getWallpaperAnalyticsParams(wallpapers[position], analyticsContext),
      theme: title, position: position + 1 });
  };
  return <>
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
      {wallpapers.map((item, position) => <article key={item.id}
        {...analyticsAttributes({ ...getWallpaperAnalyticsParams(item, analyticsContext), position: position + 1 }, 'w_wallpaper_impression')}
        className="group min-w-0 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/80 transition-shadow hover:shadow-md motion-reduce:transition-none">
        <button type="button" onClick={() => open(position)} className="relative block w-full focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-blue-600"
          aria-label={`${getI18nTexts(language).preview} ${formatWallpaperDisplayName(item.name)}`}>
          <div className="relative aspect-[4/5] overflow-hidden bg-gray-100">
            <Image src={buildPublicR2Url(item.compressPath)!} alt={formatWallpaperDisplayName(item.name)}
              fill unoptimized priority={position < 2} sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, (max-width: 1279px) 23vw, 240px"
              className={`object-cover transition-transform duration-300 group-hover:scale-[1.025] motion-reduce:transform-none motion-reduce:transition-none ${item.height! > item.width! * 1.4 ? 'object-top' : 'object-center'}`} />
            <span className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10 motion-reduce:transition-none" aria-hidden="true" />
            <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-800 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 motion-reduce:transition-none" aria-hidden="true"><Scan className="h-4 w-4" /></span>
          </div>
        </button>
        <div className="p-3 sm:p-3.5">
        <h3 className="text-sm font-medium leading-5 text-gray-900">
          <Link href={withLanguagePath(item.sourcePath, language)} prefetch={false}
            onClick={() => trackAnalyticsEvent('theme_source_click', { ...getWallpaperAnalyticsParams(item, analyticsContext), theme: title, source: item.sourcePath })}
            className="block truncate hover:text-blue-700 hover:underline" title={item.sourceName}>{item.sourceName}</Link>
        </h3>
        <p className="mt-1.5 text-xs tabular-nums text-gray-500">{wallpaperResolution(item)}</p>
        <WallpaperTags tags={item.tags} language={language} />
        </div>
      </article>)}
    </div>
    <WallpaperPreviewDownload isOpen={index !== null} onClose={() => setIndex(null)} wallpapers={wallpapers}
      analyticsContext={analyticsContext}
      currentIndex={index ?? 0} onIndexChange={setIndex} categoryName={title} />
  </>;
}
