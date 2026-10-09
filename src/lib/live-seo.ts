import type { Metadata } from 'next';
import type { Language } from '@/types';
import { getI18nTexts } from '@/lib/i18n';
import { getLiveTabData } from '@/lib/live-data';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from '@/lib/language';
import { SITE_URL } from '@/lib/seo';
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_X_IMAGES } from '@/lib/social-metadata';

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}

export function getLiveSeoCopy(language: Language, options: { category?: string; name?: string; count?: number; seoTitle?: string | null; description?: string | null } = {}) {
  const texts = getI18nTexts(language);
  const brand = getLiveTabData(language).find((tab) => tab.type === options.category)?.title || '';
  const values = { brand, name: options.name || '', count: options.count || 0 };
  const title = options.name ? fill(texts.liveDetailTitleTemplate, values)
    : options.category ? fill(texts.liveCategoryTitleTemplate, values) : texts.liveHeroTitle;
  const description = options.name ? fill(texts.liveDetailDescriptionTemplate, values)
    : options.category ? fill(texts.liveCategoryDescriptionTemplate, values) : texts.liveHeroDescription;
  return { title: options.seoTitle || title, description: options.description || description,
    subtitle: fill(texts.liveCollectionCountTemplate, values), brand };
}

export function buildLiveMetadata(language: Language, path: string, copy: { title: string; description: string }, image?: string | null): Metadata {
  const title = `${copy.title} | PhWalls`;
  const canonical = withLanguageUrl(`${SITE_URL}${path}`, language);
  return {
    title, description: copy.description,
    alternates: { canonical, languages: buildLanguageAlternates(`${SITE_URL}${path}`) },
    openGraph: { title, description: copy.description, url: canonical, type: 'website',
      locale: getOpenGraphLocaleForLanguage(language),
      images: image ? [{ url: image, alt: copy.title }, ...DEFAULT_OPEN_GRAPH_IMAGES] : DEFAULT_OPEN_GRAPH_IMAGES },
    twitter: { card: 'summary_large_image', title, description: copy.description,
      images: image ? [image] : DEFAULT_X_IMAGES },
  };
}
