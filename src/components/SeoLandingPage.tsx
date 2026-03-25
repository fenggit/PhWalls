'use client';

import Link from 'next/link';
import { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import WallpaperPreviewDownload from '@/components/WallpaperPreviewDownload';
import { useLanguage } from '@/components/LanguageProvider';
import { buildWallpaperListTitle, getTabData } from '@/lib/data';
import { Language, LanguageCode } from '@/types';
import categoryDataEn from '@/data/info/en/category-data.json';
import categoryDataZh from '@/data/info/zh/category-data.json';
import categoryDataJa from '@/data/info/ja/category-data.json';
import categoryDataVi from '@/data/info/vi/category-data.json';
import categoryDataZhHant from '@/data/info/zh-hant/category-data.json';
import { buildWallpaperDetailPath, type WallpaperCategory } from '@/lib/wallpapers';
import { SITE_URL } from '@/lib/seo';
import { withLanguagePath, withLanguageUrl } from '@/lib/language';

type LandingWallpaperItem = {
  name: string;
  type: string;
  size: string;
  originPath: string;
  compressPath: string;
  tag: string;
};

type LandingCard = {
  name: string;
  date: string;
  count: number;
  imageKey: string | null;
  wallpapers: LandingWallpaperItem[];
};

type SeoLandingPageProps = {
  breadcrumbLabel: string;
  categoryKey: string;
  categoryPath?: string;
  detailCategory?: WallpaperCategory;
  cardAspect: string;
  gridClass: string;
  cards: LandingCard[];
};

type CategoryCopy = {
  title: string;
  desc: string;
  subTitle: string;
};

type CategoryDataMap = Record<string, CategoryCopy>;

const categoryDataByLang: Record<Language, CategoryDataMap> = {
  [LanguageCode.EN]: categoryDataEn as CategoryDataMap,
  [LanguageCode.ZH]: categoryDataZh as CategoryDataMap,
  [LanguageCode.JA]: categoryDataJa as CategoryDataMap,
  [LanguageCode.VI]: categoryDataVi as CategoryDataMap,
  [LanguageCode.ZH_HANT]: categoryDataZhHant as CategoryDataMap,
};

const gradientPalette = [
  'from-blue-500 via-cyan-400 to-amber-300',
  'from-sky-600 via-slate-300 to-white',
  'from-gray-200 via-gray-100 to-gray-50',
  'from-sky-400 via-slate-300 to-slate-700',
  'from-lime-100 via-emerald-100 to-stone-100',
  'from-teal-700 via-green-200 to-yellow-100',
  'from-emerald-900 via-amber-200 to-lime-100',
  'from-rose-200 via-amber-100 to-slate-300',
];

/** compress/ 路径直接使用 CDN URL（无需签名），其他路径退回 API proxy */
function buildCardImageUrl(key: string): string {
  const cdnUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_CDN_URL;
  if (cdnUrl && key.includes('/compress/')) {
    return `${cdnUrl}/${key}`;
  }
  return `/api/public/wallpaper-image?key=${encodeURIComponent(key)}`;
}

export default function SeoLandingPage({
  breadcrumbLabel,
  categoryKey,
  categoryPath,
  detailCategory,
  cardAspect,
  gridClass,
  cards,
}: SeoLandingPageProps) {
  const { language: currentLang, setLanguage: setCurrentLang, texts } = useLanguage();
  const tabData = getTabData();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewWallpapers, setPreviewWallpapers] = useState<LandingWallpaperItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewCategory, setPreviewCategory] = useState('');

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
  };

  const openPreview = (card: LandingCard) => {
    if (!card.wallpapers || card.wallpapers.length === 0) {
      return;
    }
    setPreviewWallpapers(card.wallpapers);
    setPreviewCategory(card.name);
    setPreviewIndex(0);
    setIsPreviewOpen(true);
  };

  const currentLangData = categoryDataByLang[currentLang] || categoryDataByLang[LanguageCode.EN];
  const copy = currentLangData[categoryKey] || categoryDataByLang[LanguageCode.EN][categoryKey];
  const title = copy?.title || breadcrumbLabel;
  const pageTitle = buildWallpaperListTitle(title, texts.wallpapersTitleSuffix);
  const description = copy?.desc || '';
  const subtitle = copy?.subTitle || '';
  const breadcrumbAriaLabel = texts.breadcrumbNavigationLabel;
  const updatedLabel = texts.updatedLabel;
  const resolvedDetailCategory = detailCategory || (categoryKey.replace('-wallpapers', '') as WallpaperCategory);
  const resolvedCategoryPath = categoryPath || `/${categoryKey}`;

  const localizedHomeUrl = withLanguageUrl(SITE_URL, currentLang);
  const localizedCategoryUrl = withLanguageUrl(`${SITE_URL}${resolvedCategoryPath}`, currentLang);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: localizedHomeUrl },
              { '@type': 'ListItem', position: 2, name: pageTitle, item: localizedCategoryUrl },
            ],
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: pageTitle,
            description,
            url: localizedCategoryUrl,
            isPartOf: { '@type': 'WebSite', name: 'PhWalls', url: localizedHomeUrl },
            inLanguage:
              currentLang === LanguageCode.ZH
                ? 'zh-CN'
                : currentLang === LanguageCode.ZH_HANT
                  ? 'zh-Hant'
                  : currentLang,
          })
        }}
      />
      <Header tabData={tabData} currentLang={currentLang} onLanguageChange={handleLanguageChange} />

      <main className="mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6 lg:px-8">
        <nav aria-label={breadcrumbAriaLabel} className="mb-6 text-sm text-gray-500">
          <Link href={withLanguagePath('/', currentLang)} className="hover:text-blue-600">{texts.home}</Link>
          <span className="px-2">›</span>
          <span className="font-medium text-gray-600">{pageTitle}</span>
        </nav>

        <section className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">{pageTitle}</h1>
          <p className="mt-4 max-w-3xl text-xl leading-relaxed text-gray-600">{description}</p>
          <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
        </section>

        <section>
          <div className={`grid ${gridClass} gap-6`}>
            {cards.map((card, index) => {
              const gradient = gradientPalette[index % gradientPalette.length];
              const detailHref = withLanguagePath(buildWallpaperDetailPath(resolvedDetailCategory, card.name), currentLang);
              const cardTitle = buildWallpaperListTitle(card.name, texts.wallpapersTitleSuffix);
              return (
                <article key={card.name} className="group w-full" style={{ contentVisibility: 'auto', containIntrinsicSize: '320px 220px' }}>
                  <Link href={detailHref} className="block w-full text-left" aria-label={cardTitle}>
                    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-lg">
                      <div className={`${cardAspect} overflow-hidden`}>
                        {card.imageKey ? (
                          <img
                            src={buildCardImageUrl(card.imageKey)}
                            alt={`${card.name} preview`}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className={`h-full w-full bg-gradient-to-br ${gradient}`} />
                        )}
                      </div>
                      <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-xl bg-black/45 px-2 py-0.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path d="M3 3.75A1.75 1.75 0 0 1 4.75 2h10.5A1.75 1.75 0 0 1 17 3.75v9.5A1.75 1.75 0 0 1 15.25 15H4.75A1.75 1.75 0 0 1 3 13.25v-9.5Zm1.5.25v8h11V4h-11Zm1.25 9.5a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Zm1.5-5.5a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Zm-1 3.5h6.5l-1.8-2.4a.75.75 0 0 0-1.2 0l-1.05 1.4-.7-.95a.75.75 0 0 0-1.2 0L6.25 11.5Z" />
                        </svg>
                        <span>{card.count}</span>
                      </span>
                    </div>
                  </Link>

                  <div className="mt-3 flex items-start justify-between gap-3">
                    <h2 className="text-sm sm:text-base leading-tight font-semibold text-gray-900">
                      <Link href={detailHref} className="hover:text-blue-600">
                        {cardTitle}
                      </Link>
                    </h2>
                    <button
                      type="button"
                      onClick={() => openPreview(card)}
                      className="shrink-0 rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 transition-colors hover:border-blue-200 hover:text-blue-600"
                    >
                      {texts.preview}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{card.date} {updatedLabel}</p>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      <WallpaperPreviewDownload
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        wallpapers={previewWallpapers}
        currentIndex={previewIndex}
        onIndexChange={setPreviewIndex}
        categoryName={previewCategory}
      />

      <Footer />
    </div>
  );
}
