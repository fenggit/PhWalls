import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ThemePageChrome from '@/components/ThemePageChrome';
import ThemeWallpaperGallery from '@/components/ThemeWallpaperGallery';
import WallpaperThemeLinks from '@/components/WallpaperThemeLinks';
import { getRelatedWallpaperThemes, getWallpaperTheme, getWallpaperThemeCopy, themePath } from '@/lib/wallpaper-themes';
import { loadThemeWallpapers, loadThemeCards } from '@/lib/wallpaper-theme-db';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import { SITE_URL } from '@/lib/seo';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguagePath } from '@/lib/language';
import { getI18nTexts } from '@/lib/i18n';
import { getDiscoveryTexts, fillDiscovery } from '@/lib/discovery-i18n';

export const runtime = 'edge';
type Props = { params: Promise<{ theme: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const theme = getWallpaperTheme((await params).theme);
  if (!theme) return { robots: { index: false }, alternates: { canonical: null, languages: {} } };
  const language = await resolveMetadataLanguage();
  const copy = getWallpaperThemeCopy(theme, language);
  const texts = getDiscoveryTexts(language);
  const items = await loadThemeWallpapers(theme, language);
  if (!items.length) return { robots: { index: false }, alternates: { canonical: null, languages: {} } };
  const canonical = `${SITE_URL}${themePath(theme, language)}`;
  const title = fillDiscovery(texts.themeMetaTitle, { title: copy.title, count: items.length });
  const description = fillDiscovery(texts.themeMetaDescription, { title: language === 'en' ? copy.title.toLowerCase() : copy.title, count: items.length });
  const image = buildPublicR2Url(items[0].compressPath)!;
  return { title, description, alternates: { canonical, languages: buildLanguageAlternates(`${SITE_URL}/themes/${theme.slug}`) },
    openGraph: { title, description, url: canonical, locale: getOpenGraphLocaleForLanguage(language), type: 'website', images: [{ url: image, alt: copy.title }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] } };
}

export default async function ThemePage({ params }: Props) {
  const theme = getWallpaperTheme((await params).theme);
  if (!theme) notFound();
  const language = await resolveMetadataLanguage();
  const texts = getDiscoveryTexts(language);
  const ui = getI18nTexts(language);
  const copy = getWallpaperThemeCopy(theme, language);
  const [wallpapers, relatedCards] = await Promise.all([
    loadThemeWallpapers(theme, language), loadThemeCards(language, getRelatedWallpaperThemes(theme)),
  ]);
  if (!wallpapers.length) notFound();
  const url = `${SITE_URL}${themePath(theme, language)}`;
  const updated = new Date(Math.max(...wallpapers.map(item => item.updatedAt))).toISOString();
  const schema = { '@context': 'https://schema.org', '@type': 'ImageGallery', name: copy.title,
    description: copy.description, url, inLanguage: language, numberOfItems: wallpapers.length, dateModified: updated,
    associatedMedia: wallpapers.map(item => ({ '@type': 'ImageObject', name: item.name,
      contentUrl: buildPublicR2Url(item.compressPath), thumbnailUrl: buildPublicR2Url(item.compressPath),
      encodingFormat: 'image/webp',
      isPartOf: { '@type': 'ImageGallery', name: item.sourceName, url: `${SITE_URL}${withLanguagePath(item.sourcePath, language)}` } })) };
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: ui.home, item: `${SITE_URL}${withLanguagePath('/', language)}` },
    { '@type': 'ListItem', position: 2, name: copy.title, item: url },
  ] };
  return <ThemePageChrome>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, '\\u003c') }} />
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 md:pt-28 lg:px-8">
      <nav aria-label={ui.breadcrumbNavigationLabel} className="mb-6 text-sm text-gray-500"><Link href={withLanguagePath('/', language)} className="hover:text-blue-700">{ui.home}</Link><span aria-hidden="true" className="px-2">›</span>{copy.title}</nav>
      <header className="mb-7 max-w-3xl sm:mb-8">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{copy.title}</h1>
        <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-base">{copy.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs leading-5 text-gray-500 sm:text-sm">
          <p className="font-medium text-gray-900">{fillDiscovery(texts.themeCount, { count: wallpapers.length })}</p>
          <p>{texts.galleryPreviewHint}</p>
          <p className="text-gray-400">{texts.updated} <time dateTime={updated}>{updated.slice(0, 10)}</time></p>
        </div>
      </header>
      <ThemeWallpaperGallery wallpapers={wallpapers} title={copy.title} language={language} />
      <section className="mt-14" aria-labelledby="theme-preview-notice">
        <h2 id="theme-preview-notice" className="text-lg font-semibold">{texts.previewHeading}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600">{texts.previewNote}</p>
      </section>
      <WallpaperThemeLinks language={language} cards={relatedCards} context="related" />
    </main>
  </ThemePageChrome>;
}
