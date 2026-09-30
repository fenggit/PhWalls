'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Monitor, Search, Smartphone, X } from 'lucide-react';
import { getTabData, localizeWallpaperCollectionName } from '@/lib/data';
import { getDesktopTabData, buildDesktopWallpaperDetailPath } from '@/lib/desktop-data';
import { buildBrandPath, normalizeCategoryType } from '@/lib/brands';
import { buildWallpaperDetailPath } from '@/lib/wallpaper-data';
import { withLanguagePath } from '@/lib/language';
import { getI18nTexts } from '@/lib/i18n';
import type { Language } from '@/types';

type SearchEntry = {
  category: string;
  name: string;
  date: string;
  count: number;
  desktop: boolean;
  keywords: string;
};

type SearchResult = {
  href: string;
  title: string;
  category: string;
  desktop: boolean;
  score: number;
  date: string;
};

const normalizeSearchText = (value: string) =>
  value.toLocaleLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

export default function SearchDialog({ language, onClose }: { language: Language; onClose: () => void }) {
  const texts = getI18nTexts(language);
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/search-index.json', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Search index: ${response.status}`);
        return response.json() as Promise<SearchEntry[]>;
      })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Invalid search index');
        setEntries(data);
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.error('Search index unavailable:', error);
        setLoadState('error');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    inputRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('input, button, a[href]'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const phoneTabs = useMemo(
    () => getTabData(language).filter((tab) => !tab.link && !['design', 'desktop'].includes(normalizeCategoryType(tab.type))),
    [language]
  );
  const desktopTabs = useMemo(() => getDesktopTabData().filter((tab) => !tab.link), []);
  const categoryLabels = useMemo(() => new Map(
    [...phoneTabs, ...desktopTabs].map((tab) => [normalizeCategoryType(tab.type), tab.title])
  ), [phoneTabs, desktopTabs]);

  const results = useMemo(() => {
    const terms = normalizeSearchText(query).split(' ').filter(Boolean);
    if (!terms.length) return [];
    const matches = (value: string) => terms.every((term) => normalizeSearchText(value).includes(term));
    const found: SearchResult[] = [];

    for (const tab of phoneTabs) {
      if (!matches(`${tab.title} ${tab.type}`)) continue;
      found.push({
        href: withLanguagePath(buildBrandPath(tab.type), language),
        title: tab.title,
        category: texts.phoneNavShortLabel,
        desktop: false,
        score: 100,
        date: '',
      });
    }
    for (const tab of desktopTabs) {
      if (!matches(`${tab.title} ${tab.type}`)) continue;
      found.push({
        href: withLanguagePath(`/desktop/${normalizeCategoryType(tab.type)}`, language),
        title: tab.title,
        category: texts.desktopNavShortLabel,
        desktop: true,
        score: 100,
        date: '',
      });
    }
    for (const entry of entries) {
      const label = categoryLabels.get(entry.category) || entry.category;
      const localizedName = localizeWallpaperCollectionName(language, entry.name);
      if (!matches(`${label} ${entry.category} ${entry.name} ${localizedName} ${entry.keywords}`)) continue;
      const normalizedName = normalizeSearchText(entry.name);
      const normalizedQuery = normalizeSearchText(query);
      const score = normalizedName === normalizedQuery || normalizedName.endsWith(` ${normalizedQuery}`)
        ? 90
        : normalizedName.startsWith(normalizedQuery) ? 80 : 60;
      found.push({
        href: withLanguagePath(
          entry.desktop
            ? buildDesktopWallpaperDetailPath(entry.category, entry.name)
            : buildWallpaperDetailPath(entry.category, entry.name),
          language
        ),
        title: localizedName,
        category: label,
        desktop: entry.desktop,
        score,
        date: entry.date,
      });
    }
    return found.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date)).slice(0, 40);
  }, [query, entries, phoneTabs, desktopTabs, categoryLabels, language, texts.phoneNavShortLabel, texts.desktopNavShortLabel]);

  const visibleResults = query.trim() ? results : phoneTabs.slice(0, 6).map((tab) => ({
    href: withLanguagePath(buildBrandPath(tab.type), language),
    title: tab.title,
    category: texts.phoneNavShortLabel,
    desktop: false,
    score: 0,
    date: '',
  }));

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-3 pt-[min(12vh,6rem)] sm:px-6" role="presentation">
      <button type="button" className="absolute inset-0 bg-gray-950/45" onClick={onClose} aria-label={texts.closeSearch} />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="search-dialog-title" className="relative flex max-h-[80dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-2xl">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 px-4">
          <Search className="h-5 w-5 shrink-0 text-gray-500" aria-hidden="true" />
          <h2 id="search-dialog-title" className="sr-only">{texts.search}</h2>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                panelRef.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus();
              }
            }}
            placeholder={texts.searchPlaceholder}
            aria-label={texts.search}
            className="min-w-0 flex-1 bg-transparent text-base text-gray-950 outline-none placeholder:text-gray-500"
          />
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600" aria-label={texts.closeSearch} title={texts.closeSearch}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-2 sm:p-3" aria-live="polite">
          {!query.trim() && <p className="px-3 py-2 text-xs font-semibold text-gray-500">{texts.popularBrandsNavLabel}</p>}
          {loadState === 'loading' && query.trim() && <p className="px-3 py-6 text-sm text-gray-600">{texts.loading}</p>}
          {loadState === 'error' && <p className="px-3 py-6 text-sm text-gray-600">{texts.searchUnavailable}</p>}
          {loadState === 'ready' && query.trim() && visibleResults.length === 0 && <p className="px-3 py-6 text-sm text-gray-600">{texts.noSearchResults}</p>}
          {visibleResults.map((result) => (
            <Link key={result.href} href={result.href} onClick={onClose} className="group flex min-h-14 items-center gap-3 rounded-md px-3 py-2 text-gray-900 hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">
              {result.desktop ? <Monitor className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" /> : <Smartphone className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{result.title}</span>
                <span className="block truncate text-xs text-gray-500">{result.category}</span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-blue-700" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
