'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import WallpaperPreviewDownload from '@/components/WallpaperPreviewDownload';
import { useLanguage } from '@/components/LanguageProvider';
import { Language } from '@/types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { buildWallpaperListTitle, getTabData } from '@/lib/data';
import { buildBrandPath, getBrandCategoryBySlug } from '@/lib/brands';
import { withLanguagePath } from '@/lib/language';
import { getWallpaperCategoryLabel, type WallpaperCategory } from '@/lib/wallpapers';

interface DeviceItem {
  name: string;
  type: string;
  size: string;
  originPath: string;
  compressPath: string;
  tag: string;
}

interface DeviceData {
  name: string;
  date: string;
  item: DeviceItem[];
}

interface DeviceWallpaperGridProps {
  category: WallpaperCategory;
  deviceData: DeviceData;
  summarySection?: React.ReactNode;
  /** 服务端预构建的 CDN 图片 URL（key 格式: `${deviceData.name}-${index}`）。
   *  提供后可跳过 batch-private-urls API 调用，SSR 即包含 src，搜索引擎可抓取。
   */
  initialImageUrls?: Record<string, string>;
}

type WallpaperKind = 'phone' | 'tablet-portrait' | 'tablet-landscape' | 'desktop' | 'watch';

export default function DeviceWallpaperGrid({ category, deviceData, summarySection, initialImageUrls }: DeviceWallpaperGridProps) {
  const { language: currentLang, setLanguage: setCurrentLang, texts } = useLanguage();
  const tabData = useMemo(() => getTabData(currentLang), [currentLang]);
  const pageTitle = useMemo(
    () => buildWallpaperListTitle(deviceData.name, texts.wallpapersTitleSuffix),
    [deviceData.name, texts.wallpapersTitleSuffix]
  );

  const [imageUrls, setImageUrls] = useState<Record<string, string>>(initialImageUrls ?? {});
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewWallpapers, setPreviewWallpapers] = useState<DeviceItem[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateBatchPrivateUrls = useCallback(async (keys: string[]): Promise<Record<string, string>> => {
    try {
      const response = await fetch('/api/files/batch-private-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keys,
          env: 'production',
        }),
      });

      if (!response.ok) {
        return {};
      }

      const data = (await response.json()) as { urls?: Record<string, string> };
      return data.urls || {};
    } catch (error) {
      console.error('Failed to generate batch private URLs:', error);
      return {};
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadImageUrls = async () => {
      if (!deviceData.item || deviceData.item.length === 0) return;

      const imageKeys: string[] = [];
      const keyToIndexMap: Record<string, number> = {};

      deviceData.item.forEach((item, index) => {
        const stateKey = `${deviceData.name}-${index}`;
        // 已有 CDN URL（由服务端注入），跳过此项，无需签名请求
        if (initialImageUrls?.[stateKey]) return;

        const imagePath = item.compressPath || item.originPath;
        if (imagePath) {
          imageKeys.push(imagePath);
          keyToIndexMap[imagePath] = index;
        }
      });

      // 所有图片均有 CDN URL，无需 API 调用，直接清除 loading 状态
      if (imageKeys.length === 0) {
        if (active) {
          setImageLoadingStates({});
        }
        return;
      }

      const initialLoadingStates: Record<string, boolean> = {};
      deviceData.item.forEach((_, index) => {
        const stateKey = `${deviceData.name}-${index}`;
        if (!initialImageUrls?.[stateKey]) {
          initialLoadingStates[stateKey] = true;
        }
      });
      if (active) {
        setImageLoadingStates(initialLoadingStates);
      }

      const batchUrls = await generateBatchPrivateUrls(imageKeys);
      if (!active) return;

      const urls: Record<string, string> = { ...(initialImageUrls ?? {}) };
      Object.entries(batchUrls).forEach(([key, url]) => {
        const index = keyToIndexMap[key];
        if (index !== undefined) {
          urls[`${deviceData.name}-${index}`] = url;
        }
      });

      setImageUrls((prev) => {
        const prevEntries = Object.entries(prev);
        const nextEntries = Object.entries(urls);
        if (
          prevEntries.length === nextEntries.length &&
          prevEntries.every(([key, value]) => urls[key] === value)
        ) {
          return prev;
        }
        return urls;
      });
    };

    loadImageUrls();
    return () => {
      active = false;
    };
  }, [deviceData, generateBatchPrivateUrls, initialImageUrls]);

  const handleImageLoad = useCallback((key: string) => {
    setImageLoadingStates((prev) => {
      if (!prev[key]) {
        return prev;
      }
      return { ...prev, [key]: false };
    });
  }, []);

  const openPreview = useCallback((index: number) => {
    setPreviewWallpapers(deviceData.item);
    setPreviewIndex(index);
    setIsPreviewOpen(true);
  }, [deviceData]);

  const handleLanguageChange = (lang: Language) => {
    setCurrentLang(lang);
  };

  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const getWallpaperKind = useCallback((item: DeviceItem): WallpaperKind => {
    const name = item.name.toLowerCase();
    const path = `${item.originPath} ${item.compressPath}`.toLowerCase();
    const combined = `${name} ${path}`;

    if (combined.includes('watch')) return 'watch';
    if (combined.includes('mac') || combined.includes('imac') || combined.includes('macos/')) return 'desktop';
    if (combined.includes('iphone') || combined.includes('ios/')) return 'phone';
    if (combined.includes('landscape')) return 'tablet-landscape';
    if (combined.includes('portrait')) return 'tablet-portrait';
    if (combined.includes('ipad') || combined.includes('ipados/')) return 'tablet-landscape';
    return 'phone';
  }, []);

  const getAspectRatioByKind = useCallback((kind: WallpaperKind) => {
    switch (kind) {
      case 'desktop':
        return 'aspect-[16/10]';
      case 'tablet-landscape':
        return 'aspect-[4/3]';
      case 'tablet-portrait':
        return 'aspect-[3/4]';
      case 'watch':
        return 'aspect-square';
      case 'phone':
      default:
        return 'aspect-[9/16]';
    }
  }, []);

  const getGridColsByKind = useCallback((kind: WallpaperKind) => {
    switch (kind) {
      case 'desktop':
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 'tablet-landscape':
      case 'tablet-portrait':
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      case 'watch':
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
      case 'phone':
      default:
        return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6';
    }
  }, []);

  const getGroupTitle = useCallback((kind: WallpaperKind) => {
    if (kind === 'phone') return texts.phoneWallpapersGroupTitle;
    if (kind === 'tablet-portrait') return texts.ipadPortraitWallpapersGroupTitle;
    if (kind === 'tablet-landscape') return texts.ipadLandscapeWallpapersGroupTitle;
    if (kind === 'desktop') return texts.desktopWallpapersGroupTitle;
    return texts.watchWallpapersGroupTitle;
  }, [texts]);

  const hdFreeLabel = texts.hdFreeLabel;
  const backToTopLabel = texts.backToTopLabel;
  const breadcrumbAriaLabel = texts.breadcrumbNavigationLabel;
  const categoryBreadcrumbLabel = useMemo(() => {
    return buildWallpaperListTitle(getWallpaperCategoryLabel(category), texts.wallpapersTitleSuffix);
  }, [category, texts.wallpapersTitleSuffix]);
  const categoryLandingPath = useMemo(() => {
    const brand = getBrandCategoryBySlug(category);
    return brand ? buildBrandPath(brand.type) : `/${category}`;
  }, [category]);

  const pageDescription = useMemo(
    () => texts.multiResolutionPageDescription.replace('{pageTitle}', pageTitle),
    [pageTitle, texts.multiResolutionPageDescription]
  );

  const getWallpaperAlt = useCallback(
    (item: DeviceItem) => `${item.name} - ${deviceData.name} ${texts.wallpaperAltSuffix}`,
    [deviceData.name, texts.wallpaperAltSuffix]
  );

  const itemsWithKind = useMemo(
    () => deviceData.item.map((item, index) => ({ item, index, kind: getWallpaperKind(item) })),
    [deviceData.item, getWallpaperKind]
  );

  const groupedWallpapers = useMemo(
    () =>
      (['phone', 'tablet-portrait', 'tablet-landscape', 'desktop', 'watch'] as WallpaperKind[])
        .map((kind) => ({
          kind,
          title: getGroupTitle(kind),
          aspectRatio: getAspectRatioByKind(kind),
          gridCols: getGridColsByKind(kind),
          items: itemsWithKind.filter((entry) => entry.kind === kind).map(({ item, index }) => ({ item, index })),
        }))
        .filter((group) => group.items.length > 0),
    [getAspectRatioByKind, getGridColsByKind, getGroupTitle, itemsWithKind]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header
        tabData={tabData}
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
      />

      <main className={`mx-auto max-w-7xl px-4 pb-12 pt-28 sm:px-6 lg:px-8 transition-all duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <nav aria-label={breadcrumbAriaLabel} className="mb-6 text-sm text-gray-500">
          <Link href={withLanguagePath('/', currentLang)} className="hover:text-blue-600">
            {texts.home}
          </Link>
          <span className="px-2">›</span>
          <Link href={withLanguagePath(categoryLandingPath, currentLang)} className="hover:text-blue-600">
            {categoryBreadcrumbLabel}
          </Link>
          <span className="px-2">›</span>
          <span className="font-medium text-gray-600">{pageTitle}</span>
        </nav>

        <section className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">{pageTitle}</h1>
          <p className="mt-4 max-w-3xl text-xl leading-relaxed text-gray-600">{pageDescription}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-500">
            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-gray-200">
              {deviceData.item.length} {texts.wallpapers}
            </span>
            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-gray-200">
              {deviceData.date}
            </span>
            <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 font-medium text-green-600 ring-1 ring-green-100">
              {hdFreeLabel}
            </span>
          </div>
        </section>

        <div className="space-y-12">
          {groupedWallpapers.map((group, groupIndex) => (
            <section key={group.kind}>
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-gray-900">{group.title}</h2>
                  <p className="mt-1 text-xs sm:text-sm text-gray-500">{group.items.length} {texts.wallpapers}</p>
                </div>
              </div>

              <div className={`grid ${group.gridCols} gap-6`}>
                {group.items.map(({ item, index }, itemIndex) => {
                  const imageKey = `${deviceData.name}-${index}`;
                  const imageUrl = imageUrls[imageKey];
                  const isPriorityImage = groupIndex === 0 && itemIndex < 2;

                  return (
                    <article key={imageKey} className="group w-full">
                      <button
                        type="button"
                        onClick={() => openPreview(index)}
                        className="block w-full text-left"
                        aria-label={`${texts.preview} ${item.name}`}
                      >
                        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-lg">
                          <div className={`${group.aspectRatio} overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white`}>
                            {imageLoadingStates[imageKey] && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
                                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                              </div>
                            )}

                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={getWallpaperAlt(item)}
                                className={`h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105 ${
                                  imageLoadingStates[imageKey] ? 'opacity-0' : 'opacity-100'
                                }`}
                                loading={isPriorityImage ? 'eager' : 'lazy'}
                                fetchPriority={isPriorityImage ? 'high' : 'low'}
                                decoding="async"
                                onLoad={() => handleImageLoad(imageKey)}
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  handleImageLoad(imageKey);
                                }}
                              />
                            ) : null}
                          </div>

                          <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="translate-y-2 transform transition-transform duration-300 group-hover:translate-y-0">
                                <div className="rounded-full bg-white/95 p-3 shadow-2xl backdrop-blur-sm">
                                  <svg className="h-6 w-6 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 0 1 6 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>

                          <span className="absolute bottom-3 right-3 inline-flex items-center rounded-xl bg-black/45 px-2 py-0.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
                            {item.type.split('/')[1].toUpperCase()}
                          </span>
                        </div>
                      </button>

                      <h3 className="mt-3 text-xs sm:text-sm font-semibold leading-tight text-gray-900">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs text-gray-500">{item.size}</p>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {summarySection}
      </main>

      <WallpaperPreviewDownload
        isOpen={isPreviewOpen}
        onClose={closePreview}
        wallpapers={previewWallpapers}
        currentIndex={previewIndex}
        onIndexChange={setPreviewIndex}
        categoryName={deviceData.name}
      />

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="fixed bottom-8 right-8 z-40 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-4 text-white shadow-2xl transition-all duration-300 hover:scale-110 group"
        aria-label={backToTopLabel}
      >
        <svg className="h-6 w-6 transition-transform duration-300 group-hover:-translate-y-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      </button>

      <Footer />
    </div>
  );
}
