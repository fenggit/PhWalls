import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { Language } from '@/types';
import { getWallpaperTheme, themePath } from '@/lib/wallpaper-themes';
import { DEVICE_THEME_LABEL_KEYS } from '@/lib/device-theme';
import { getI18nTexts } from '@/lib/i18n';
import { getDiscoveryTexts, fillDiscovery } from '@/lib/discovery-i18n';
import type { ThemeCard } from '@/lib/wallpaper-theme-db';

export default function WallpaperThemeLinks({ language, cards, context = 'home' }: {
  language: Language; cards: ThemeCard[]; context?: 'home' | 'related';
}) {
  const texts = getI18nTexts(language);
  if (!cards.length) return null;
  const related = context === 'related';
  const headingId = related ? 'related-wallpaper-themes-title' : 'wallpaper-themes-title';
  return <section className={`border-t border-gray-200 ${related ? 'mt-10 pt-8' : 'py-9 sm:py-11'}`} aria-labelledby={headingId}>
    <h2 id={headingId} className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">{related ? getDiscoveryTexts(language).relatedThemes : getDiscoveryTexts(language).themes}</h2>
    <nav aria-labelledby={headingId} className={`mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 ${related ? '' : 'lg:grid-cols-5'}`}>
      {cards.map(card => {
        const theme = getWallpaperTheme(card.slug);
        if (!theme) return null;
        const label = texts[DEVICE_THEME_LABEL_KEYS[theme.key]];
        return <Link key={theme.slug} href={themePath(theme, language)} prefetch={false}
          className="group min-w-0 overflow-hidden rounded-2xl bg-white ring-1 ring-gray-200/80 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 motion-reduce:transition-none">
          <div className={`relative overflow-hidden bg-gray-100 ${related ? 'aspect-[16/10]' : 'aspect-[5/4]'}`}>
            <Image src={card.coverUrl} alt={label} fill unoptimized loading="lazy"
              sizes={related ? '(max-width: 639px) 45vw, 390px' : '(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 240px'}
              className={`object-cover transition-transform duration-300 group-hover:scale-[1.035] motion-reduce:transform-none motion-reduce:transition-none ${card.coverPosition === 'top' ? 'object-top' : 'object-center'}`} />
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-gray-900 sm:text-base" title={label}>{label}</h3>
              <p className="mt-1 text-xs text-gray-500">{fillDiscovery(getDiscoveryTexts(language).themeCount, { count: card.count })}</p>
            </div>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-blue-600" aria-hidden="true" />
          </div>
        </Link>;
      })}
    </nav>
  </section>;
}
