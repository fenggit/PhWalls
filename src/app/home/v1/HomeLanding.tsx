'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Monitor } from 'lucide-react';
import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShareRegistration from '@/components/ShareRegistration';
import { useLanguage } from '@/components/LanguageProvider';
import { buildWallpaperListTitle, getTabData, localizeWallpaperCollectionName } from '@/lib/data';
import { buildBrandPath, normalizeCategoryType } from '@/lib/brands';
import { isHomeCategoryVisible } from '@/lib/home-priority';
import { withLanguagePath } from '@/lib/language';
import { SITE_URL } from '@/lib/seo';
import type { I18nTexts } from '@/lib/i18n';
import type { Language } from '@/types';

type CollectionCard = {
  category: string;
  name: string;
  href: string;
  imageUrl: string | null;
};

type PhoneCollectionCard = CollectionCard & {
  date: string;
  count: number;
};

type HomeLandingProps = {
  latest: PhoneCollectionCard[];
  popular: Array<{ category: string; cards: PhoneCollectionCard[] }>;
  desktop: CollectionCard[];
};

const BRAND_PREVIEW_VISIBILITY = [
  '',
  '',
  'hidden sm:block',
  'hidden lg:block',
  'hidden xl:block',
  'hidden 2xl:block',
] as const;

function PhoneCard({
  item,
  language,
  texts,
  priority = false,
  headingLevel = 3,
  className = '',
}: {
  item: PhoneCollectionCard;
  language: Language;
  texts: I18nTexts;
  priority?: boolean;
  headingLevel?: 3 | 4;
  className?: string;
}) {
  const displayName = localizeWallpaperCollectionName(language, item.name);
  const title = buildWallpaperListTitle(displayName, texts.wallpapersTitleSuffix);

  return (
    <Link
      href={withLanguagePath(item.href, language)}
      aria-label={`${title} ${texts.preview}`}
      prefetch={false}
      className={`group block min-w-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${className}`}
    >
      <article className="relative overflow-hidden rounded-2xl bg-white shadow-md transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-lg">
        <div className="relative aspect-[9/16] overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
          {item.imageUrl && (
            <Image
              src={item.imageUrl}
              alt={`${displayName} ${texts.hdWallpaperDownloadAlt}`}
              fill
              unoptimized
              priority={priority}
              sizes="(max-width: 1023px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          )}
        </div>
        <div className="space-y-1 p-3 text-center">
          <div role="heading" aria-level={headingLevel} className="truncate text-sm font-semibold leading-tight text-gray-900">{title}</div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
            <span>{item.date}</span>
            <span className="h-1 w-1 rounded-full bg-gray-300" aria-hidden="true" />
            <span className="font-medium">{item.count} {texts.count}</span>
          </div>
        </div>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/20 group-hover:opacity-100">
          <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-900">{texts.preview}</span>
        </span>
      </article>
    </Link>
  );
}

function CategoryLink({ label, slug, language }: { label: string; slug: string; language: Language }) {
  const iconPath = `/brand-icons/${slug === 'redmi' ? 'xiaomi' : slug}.svg`;
  return (
    <Link
      href={withLanguagePath(buildBrandPath(slug), language)}
      className="group flex min-h-14 min-w-0 items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 transition-colors hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      <span className="flex h-8 w-9 shrink-0 items-center justify-center">
        <Image src={iconPath} alt="" width={32} height={28} className="object-contain" />
      </span>
      <span className="min-w-0 text-sm font-semibold leading-5 text-gray-800 group-hover:text-blue-800">{label}</span>
      <ArrowRight className="ml-auto hidden h-4 w-4 shrink-0 text-gray-400 sm:block" aria-hidden="true" />
    </Link>
  );
}

export default function HomeLanding({ latest, popular, desktop }: HomeLandingProps) {
  const { language, setLanguage, texts } = useLanguage();
  const pathname = usePathname();
  const tabs = getTabData(language);
  const tabBySlug = new Map(tabs.map((tab) => [normalizeCategoryType(tab.type), tab]));
  const getPopularBrandTitle = (category: string) => {
    const label = (tabBySlug.get(category)?.title || category).trim();
    if ((language === 'zh' || language === 'zh-hant') && /[\u3400-\u9fff]$/.test(label)) {
      return `${label}${texts.wallpapersTitleSuffix}`;
    }
    return buildWallpaperListTitle(label, texts.wallpapersTitleSuffix);
  };
  const phoneBrands = tabs.filter((tab) =>
    !tab.link && isHomeCategoryVisible(tab.type) &&
    !['android', 'desktop'].includes(normalizeCategoryType(tab.type))
  );
  const sharePayload = useMemo(() => ({
    title: texts.heroTitle,
    url: new URL(pathname, SITE_URL).toString(),
    brand: texts.siteName,
    images: latest.map((item) => item.imageUrl).filter((url): url is string => Boolean(url)).slice(0, 6),
  }), [latest, pathname, texts.heroTitle, texts.siteName]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <ShareRegistration payload={sharePayload} />
      <Header currentLang={language} onLanguageChange={setLanguage} />
      <main className="pt-16 md:pt-20">
        <section className="relative isolate overflow-hidden bg-gray-900 text-white" aria-labelledby="home-title">
          <div className="absolute inset-0" aria-hidden="true">
            <Image
              src="/hero/phwalls-home-hero-v1.webp"
              alt=""
              fill
              unoptimized
              priority
              sizes="100vw"
              className="object-cover object-left md:object-center"
            />
          </div>
          <div className="relative mx-auto flex min-h-[250px] max-w-7xl flex-col justify-center px-4 py-10 sm:min-h-[290px] sm:px-6 sm:py-12 lg:px-8">
            <h1 id="home-title" className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{texts.heroTitle}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/90 sm:text-base sm:leading-7">{texts.homeHeroLead}</p>
          </div>
        </section>
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <section aria-labelledby="home-latest" className="py-8 sm:py-10">
            <div className="mb-8 text-center">
              <h2 id="home-latest" className="text-3xl font-bold text-gray-900 sm:text-4xl">{texts.homeLatestTitle}</h2>
              <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            </div>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {latest.map((item, index) => (
                <PhoneCard
                  key={`${item.category}:${item.name}`}
                  item={item}
                  language={language}
                  texts={texts}
                  priority={index < 4}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="home-popular" className="border-t border-gray-200 py-9 sm:py-11">
            <div className="mb-10 text-center">
              <h2 id="home-popular" className="text-3xl font-bold text-gray-900 sm:text-4xl">{texts.homePopularBrandsTitle}</h2>
              <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            </div>
            <div className="space-y-12 sm:space-y-14">
              {popular.map(({ category, cards }) => (
                <section key={category} aria-labelledby={`home-popular-${category}`}>
                  <h3 id={`home-popular-${category}`} className="mb-6 text-center text-2xl font-bold text-gray-900">
                    {getPopularBrandTitle(category)}
                  </h3>
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {cards.map((item, index) => (
                      <PhoneCard
                        key={`${item.category}:${item.name}`}
                        item={item}
                        language={language}
                        texts={texts}
                        headingLevel={4}
                        className={BRAND_PREVIEW_VISIBILITY[index] ?? 'hidden'}
                      />
                    ))}
                  </div>
                  <div className="mt-6 flex justify-center">
                    <Link
                      href={withLanguagePath(buildBrandPath(category), language)}
                      className="inline-flex items-center rounded-full border border-blue-200 bg-white px-5 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      {texts.viewAllWallpapers}
                    </Link>
                  </div>
                </section>
              ))}
            </div>
          </section>

          <section aria-labelledby="home-desktop" className="border-t border-gray-200 py-9 sm:py-11">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-blue-600" aria-hidden="true" />
                <h2 id="home-desktop" className="text-xl font-semibold sm:text-2xl">{texts.homeDesktopTitle}</h2>
              </div>
              <Link href={withLanguagePath('/desktop', language)} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline">
                {texts.homeBrowseDesktop}<ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-5">
              {desktop.map((item) => (
                <Link
                  key={`${item.category}:${item.name}`}
                  href={withLanguagePath(item.href, language)}
                  className="group min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-white transition-colors hover:border-blue-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  <div className="relative aspect-video overflow-hidden bg-gray-100">
                    {item.imageUrl && (
                      <Image src={item.imageUrl} alt={item.name} fill unoptimized sizes="(max-width: 639px) 100vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    )}
                  </div>
                  <h3 className="px-3 py-3 text-sm font-semibold sm:px-4 sm:text-base">{item.name}</h3>
                </Link>
              ))}
            </div>
          </section>

          <section aria-labelledby="home-all-brands" className="border-t border-gray-200 py-9 sm:py-11">
            <h2 id="home-all-brands" className="mb-5 text-xl font-semibold sm:text-2xl">{texts.homeAllBrandsTitle}</h2>
            <nav aria-label={texts.homeAllBrandsTitle} className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
              {phoneBrands.map((brand) => (
                <CategoryLink
                  key={brand.type}
                  label={brand.title}
                  slug={normalizeCategoryType(brand.type)}
                  language={language}
                />
              ))}
            </nav>
          </section>
          {tabBySlug.has('android') && (
            <section aria-labelledby="home-system" className="border-t border-gray-200 pt-9 sm:pt-11">
              <h2 id="home-system" className="mb-5 text-xl font-semibold sm:text-2xl">{texts.homeSystemTitle}</h2>
              <nav aria-label={texts.homeSystemTitle} className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                <CategoryLink label={tabBySlug.get('android')?.title || 'Android'} slug="android" language={language} />
              </nav>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
