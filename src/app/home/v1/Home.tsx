'use client';

import Link from 'next/link';
import { Fragment, useState, useEffect, useCallback, useMemo } from 'react';
import Header from '@/components/Header';
import WallpaperPreviewDownload from '@/components/WallpaperPreviewDownload';
import Footer from '@/components/Footer';
import { Language } from '@/types';
import { buildWallpaperListTitle, getTabData, sortByDateDesc } from '@/lib/data';
import { useLanguage } from '@/components/LanguageProvider';
import { normalizeCategoryType } from '@/lib/brands';
import {
  buildWallpaperDetailPath,
  getWallpaperCollections,
  isWallpaperCategory,
  type WallpaperCategory,
} from '@/lib/wallpapers';
import { withLanguagePath } from '@/lib/language';

type HomeProps = {
  initialImageUrls?: Record<string, string>;
  isMobilePriority?: boolean;
};

// 首页组件：聚合展示所有壁纸分类、卡片预览和广告位。
export default function Home({ initialImageUrls = {}, isMobilePriority = false }: HomeProps) {
  // 使用LanguageProvider
  const { language: currentLang, setLanguage: setCurrentLang, texts } = useLanguage();
  const [imageUrls, setImageUrls] = useState<Record<string, string>>(initialImageUrls);
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});
  const [viewportWidth, setViewportWidth] = useState(1536);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  
  // 预览模态框状态
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewWallpapers, setPreviewWallpapers] = useState<any[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewCategory, setPreviewCategory] = useState('');
  
  // 返回顶部按钮显示状态
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // 直接获取导航数据
  const tabData = useMemo(() => getTabData(), []);
  const categoryDataMap = useMemo(() => {
    return tabData.reduce<Record<string, any[]>>((acc, tab) => {
      const normalized = normalizeCategoryType(tab.type);
      if (isWallpaperCategory(normalized)) {
        acc[normalized] = sortByDateDesc(getWallpaperCollections(normalized));
      }
      return acc;
    }, {});
  }, [tabData]);

  // 将 tab.type 转成可用于 DOM id 的锚点（避免空格导致 scroll 定位异常）
  const getCategoryAnchorId = useCallback((categoryType: string) => {
    return normalizeCategoryType(categoryType);
  }, []);
  
  // 批量生成私有URL的函数
  const generateBatchPrivateUrls = useCallback(async (keys: string[]): Promise<Record<string, string>> => {
    try {
      const response = await fetch('/api/files/batch-private-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keys,
          env: 'production'
        }),
      });

      if (!response.ok) {
        return {};
      }

      const data = await response.json();
      return data.urls || {};
    } catch (error) {
      console.error('Failed to generate batch private URLs:', error);
      return {};
    }
  }, []);

  // 处理图片加载状态
  const handleImageLoad = useCallback((categoryName: string) => {
    setImageLoadingStates((prev) => {
      if (!prev[categoryName]) {
        return prev;
      }
      return {
        ...prev,
        [categoryName]: false,
      };
    });
  }, []);

  // 预加载所有图片的私有URL
  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleCallbackId: number | null = null;

    const loadImages = async () => {
      const allImageKeys: string[] = [];
      const keyToCardMap: Record<string, string[]> = {};

      Object.entries(categoryDataMap).forEach(([categoryType, list]) => {
        list.forEach((collection) => {
          const cardImageKey = `${categoryType}::${collection.name}`;
          if (initialImageUrls[cardImageKey]) {
            return;
          }
          const firstImage = collection.item?.[0];
          const imagePath = firstImage?.compressPath || firstImage?.originPath;
          if (!imagePath) {
            return;
          }
          allImageKeys.push(imagePath);
          if (!keyToCardMap[imagePath]) {
            keyToCardMap[imagePath] = [];
          }
          keyToCardMap[imagePath].push(cardImageKey);
        });
      });

      if (cancelled) return;

      if (allImageKeys.length === 0) {
        setImageLoadingStates({});
        return;
      }

      const initialLoadingStates: Record<string, boolean> = {};
      Object.values(keyToCardMap).flat().forEach((cardImageKey) => {
        initialLoadingStates[cardImageKey] = true;
      });
      setImageLoadingStates(initialLoadingStates);

      const batchUrls = await generateBatchPrivateUrls(allImageKeys);
      if (cancelled) return;

      setImageUrls((prev) => {
        const next: Record<string, string> = { ...prev };
        let changed = false;

        Object.entries(batchUrls).forEach(([key, url]) => {
          const cardImageKeys = keyToCardMap[key] || [];
          cardImageKeys.forEach((cardImageKey) => {
            if (next[cardImageKey] !== url) {
              next[cardImageKey] = url;
              changed = true;
            }
          });
        });

        return changed ? next : prev;
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleCallbackId = (window as any).requestIdleCallback(() => {
        void loadImages();
      }, { timeout: 5000 });
    } else {
      timeoutId = setTimeout(() => {
        void loadImages();
      }, 100);
    }

    return () => {
      cancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (idleCallbackId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(idleCallbackId);
      }
    };
  }, [categoryDataMap, generateBatchPrivateUrls, initialImageUrls]);

  // 语言切换处理
  const handleLanguageChange = useCallback((lang: Language) => {
    setCurrentLang(lang);
  }, [setCurrentLang]);

  // 滚动性能优化
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // 显示/隐藏返回顶部按钮
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const nextShowBackToTop = scrollTop > 400;
          setShowBackToTop((prev) => (prev === nextShowBackToTop ? prev : nextShowBackToTop));
          
          ticking = false;
        });
        ticking = true;
      }
    };
    
    // 添加被动事件监听器
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 返回顶部函数
  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  // 打开预览模态框
  const openPreview = useCallback((categoryName: string, wallpapers: any[]) => {
    // 打开预览
    setPreviewCategory(categoryName);
    setPreviewWallpapers(wallpapers);
    setPreviewIndex(0);
    setIsPreviewOpen(true);
  }, []);

  // 关闭预览模态框
  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  // 处理预览索引变化
  const handlePreviewIndexChange = useCallback((index: number) => {
    setPreviewIndex(index);
  }, []);

  const visibleCategories = useMemo(
    () => tabData.filter((cat) => cat.type.toLowerCase() !== 'design'),
    [tabData]
  );

  useEffect(() => {
    const updateViewportWidth = () => {
      const width = window.innerWidth;
      setViewportWidth((prev) => (prev === width ? prev : width));
    };

    updateViewportWidth();
    window.addEventListener('resize', updateViewportWidth, { passive: true });

    return () => {
      window.removeEventListener('resize', updateViewportWidth);
    };
  }, []);

  const getColumnsForCategory = useCallback((categoryType: string) => {
    const width = viewportWidth;
    if (categoryType === 'iphone' || categoryType === 'ios') {
      if (width >= 1536) return 6;
      if (width >= 1280) return 5;
      if (width >= 1024) return 4;
      if (width >= 640) return 3;
      return 2;
    }
    if (width >= 1536) return 6;
    if (width >= 1280) return 5;
    if (width >= 1024) return 4;
    if (width >= 640) return 3;
    return 2;
  }, [viewportWidth]);

  const getDetailCategory = useCallback((categoryType: string): WallpaperCategory | null => {
    const normalized = normalizeCategoryType(categoryType);
    if (isWallpaperCategory(normalized)) {
      return normalized;
    }
    return null;
  }, []);

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 scroll-container">
      {/* 导航栏 */}
      <Header 
        tabData={tabData}
        currentLang={currentLang} 
        onLanguageChange={handleLanguageChange}
      />

      {/* 主要内容区域 */}
      <main className="pt-24 md:pt-20">

        <div className="sr-only md:hidden">
          <h1>{texts.heroTitle}</h1>
          <p>{texts.heroDescription}</p>
        </div>

        {/* 英雄区域 */}
        <section className="hidden md:block text-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 tracking-tight">
              {texts.heroTitle}
            </h1>
            <p className="text-xl text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
              {texts.heroDescription}
            </p>
          </div>
        </section>

        {/* 产品展示区域 */}
        {visibleCategories.map((category, index) => {
          const categoryType = normalizeCategoryType(category.type);
          const categoryKey = categoryType;
          const categoryAnchorId = getCategoryAnchorId(category.type);
          
          const h2Title = buildWallpaperListTitle(category.title, texts.wallpapersTitleSuffix);

          // 获取显示数据
          const displayData = categoryDataMap[categoryType] || [];

          // 根据平台类型设置不同的卡片样式
          const cardStyle = (() => {
            switch (categoryType) {
              case 'iphone':
                return {
                  aspectRatio: 'aspect-[9/16]', // 更紧凑的iPhone比例
                  gridCols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
                  cardClass: 'rounded-2xl', // 适中的圆角
                  shadowClass: 'shadow-md hover:shadow-lg',
                  gradientFrom: 'from-blue-50',
                  gradientTo: 'to-purple-50'
                };
              case 'ipad':
                return {
                  aspectRatio: 'aspect-[4/3]', // iPad 比例
                  gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                  cardClass: 'rounded-2xl',
                  shadowClass: 'shadow-lg hover:shadow-xl',
                  gradientFrom: 'from-green-50',
                  gradientTo: 'to-blue-50'
                };
              case 'mac':
                return {
                  aspectRatio: 'aspect-[16/10]', // Mac 比例，与 macOS 保持一致
                  gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                  cardClass: 'rounded-xl',
                  shadowClass: 'shadow-lg hover:shadow-xl',
                  gradientFrom: 'from-gray-50',
                  gradientTo: 'to-slate-50'
                };
              case 'ios':
                return {
                  aspectRatio: 'aspect-[9/16]', // iOS 比例，类似iPhone
                  gridCols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
                  cardClass: 'rounded-2xl',
                  shadowClass: 'shadow-md hover:shadow-lg',
                  gradientFrom: 'from-purple-50',
                  gradientTo: 'to-pink-50'
                };
              case 'ipados':
                return {
                  aspectRatio: 'aspect-[4/3]', // iPadOS 比例，类似iPad
                  gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
                  cardClass: 'rounded-2xl',
                  shadowClass: 'shadow-lg hover:shadow-xl',
                  gradientFrom: 'from-indigo-50',
                  gradientTo: 'to-purple-50'
                };
              case 'macos':
                return {
                  aspectRatio: 'aspect-[16/10]', // iMac 比例
                  gridCols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
                  cardClass: 'rounded-xl',
                  shadowClass: 'shadow-lg hover:shadow-xl',
                  gradientFrom: 'from-gray-50',
                  gradientTo: 'to-slate-50'
                };
              default:
                return {
                  aspectRatio: 'aspect-[9/16]',
                  gridCols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
                  cardClass: 'rounded-2xl',
                  shadowClass: 'shadow-lg hover:shadow-xl',
                  gradientFrom: 'from-gray-50',
                  gradientTo: 'to-gray-100'
                };
            }
          })();

          const totalItems = Array.isArray(displayData) ? displayData.length : 0;
          const previewRowsCount = 2;
          const previewItemsCount = getColumnsForCategory(categoryType) * previewRowsCount;
          const isExpanded = Boolean(expandedCategories[categoryKey]);
          const shouldShowViewAll = totalItems > previewItemsCount;
          const listData = isExpanded || !shouldShowViewAll
            ? displayData
            : displayData.slice(0, previewItemsCount);

          const viewAllText = texts.viewAllWallpapers;

          return (
            <Fragment key={category.type}>
              <section 
                id={categoryAnchorId} 
                className="py-8 sm:py-10 px-4 sm:px-6 lg:px-8 scroll-mt-20"
              >
                <div className="max-w-7xl mx-auto">
                  {/* 产品分类标题 */}
                  <div className="text-center mb-8">
                    <h2 
                      id={`${categoryAnchorId}-wallpapers`}
                      className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 tracking-tight"
                    >
                      {h2Title}
                    </h2>
                    <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
                  </div>

                  {/* 产品列表 */}
                  <div className={`grid ${cardStyle.gridCols} gap-6`}>
                    {listData && Array.isArray(listData) && listData.map((item: any, listIndex: number) => {
                    // 获取第一个图片用于所有模块
                    const getFirstImage = () => {
                      if (item.item && item.item.length > 0) {
                        return item.item[0];
                      }
                      return null;
                    };

                    const firstImage = getFirstImage();
                    // 使用稳定的 key，确保服务器端和客户端一致
                    // 使用 categoryType 和 item.name 组合，确保唯一性和稳定性
                    const itemKey = `${categoryType}-${item.name}`;
                    const itemId = `${categoryType}-${item.name}`;
                    const cardImageKey = `${categoryType}::${item.name}`;

                    const detailCategory = getDetailCategory(categoryType);
                    const detailHref = detailCategory
                      ? withLanguagePath(buildWallpaperDetailPath(detailCategory, item.name), currentLang)
                      : null;
                    const itemTitle = buildWallpaperListTitle(item.name, texts.wallpapersTitleSuffix);
                    const isPriorityImage = isMobilePriority && index === 0 && listIndex < 2;

                    return (
                      <div 
                        key={itemKey}
                        id={itemId} 
                        className="scroll-mt-24"
                      >
                        <article className={`group relative bg-white ${cardStyle.cardClass} ${cardStyle.shadowClass} transition-transform duration-200 ease-out hover:-translate-y-1 overflow-hidden will-change-transform`}>
                          {detailHref ? (
                            <Link
                              href={detailHref}
                              className="block"
                              aria-label={`${itemTitle} ${texts.preview}`}
                              prefetch={false}
                            >
                          {/* 产品图片 */}
                          <div className={`${cardStyle.aspectRatio} bg-gradient-to-br ${cardStyle.gradientFrom} ${cardStyle.gradientTo} relative overflow-hidden critical-above-fold`}>
                            {firstImage && imageUrls[cardImageKey] ? (
                              // 显示真实图片
                              <>
                                {/* 加载动画骨架屏 */}
                                {imageLoadingStates[cardImageKey] && (
                                  <div className="absolute inset-0 flex items-center justify-center z-10">
                                    <div className="flex space-x-1.5">
                                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full subtle-loading-dot" style={{animationDelay: '0ms'}}></div>
                                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full subtle-loading-dot" style={{animationDelay: '200ms'}}></div>
                                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full subtle-loading-dot" style={{animationDelay: '400ms'}}></div>
                                    </div>
                                  </div>
                                )}
                                
                                <img 
                                  src={imageUrls[cardImageKey]}
                                  alt={`${item.name} ${texts.hdWallpaperDownloadAlt} - ${category.type}`}
                                  className={`w-full h-full object-cover group-hover:scale-102 transition-all duration-500 ease-out will-change-transform ${
                                    imageLoadingStates[cardImageKey] ? 'opacity-0' : 'opacity-100 image-fade-in'
                                  }`}
                                  loading={isPriorityImage ? 'eager' : 'lazy'}
                                  fetchPriority={isPriorityImage ? 'high' : 'low'}
                                  decoding="async"
                                  onLoad={() => {
                                    handleImageLoad(cardImageKey);
                                  }}
                                  onError={(e) => {
                                    // 图片加载失败时显示占位符
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    const placeholder = target.nextElementSibling as HTMLElement;
                                    if (placeholder) placeholder.style.display = 'flex';
                                    handleImageLoad(cardImageKey); // 确保加载状态被清除
                                  }}
                                />
                                {/* 图片加载失败时的占位符 */}
                                <div className="w-full h-full flex items-center justify-center hidden">
                                  <div className="relative">
                                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 opacity-40 flex items-center justify-center">
                                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : (
                              // 其他平台的占位符
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="relative">
                                  {/* 柔和的渐变背景 */}
                                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 opacity-40 group-hover:opacity-60 transition-opacity duration-300 flex items-center justify-center">
                                    {/* 简洁的壁纸图标 */}
                                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                          </div>

                          {/* 产品信息 */}
                          <div className="p-3">
                            {item.item && item.item.length > 0 ? (
                              // 有壁纸数据的设备：显示名称、日期和数量
                              <div className="text-center space-y-1">
                                {/* 设备名称 - 使用 div 代替 h3 以优化 SEO heading 结构 */}
                                <div className="text-sm font-semibold text-gray-900 line-clamp-1 leading-tight" role="heading" aria-level={3}>
                                  {itemTitle}
                                </div>
                                
                                {/* 日期和数量一行显示 */}
                                <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                                  {/* 日期 */}
                                  {item.date && (
                                    <div>
                                      {item.date}
                                    </div>
                                  )}
                                  
                                  {/* 分隔符 */}
                                  {item.date && (
                                    <div className="w-1 h-1 bg-gray-300 rounded-full"></div>
                                  )}
                                  
                                  {/* 数量 */}
                                  <div className="font-medium">
                                    {item.item ? item.item.length : 0} {texts.count}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // 其他平台：显示标题和平台标识
                              <div>
                                <div className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2 min-h-[2.5rem]" role="heading" aria-level={3}>
                                  {item.title}
                                </div>
                                
                                {/* 平台标识 */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-sm text-gray-500 font-medium">
                                      {category.title}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (item.item && item.item.length > 0) {
                                  openPreview(item.name, item.item);
                                } else {
                                  alert(texts.noWallpaperData);
                                }
                              }}
                              className="block w-full text-left"
                            >
                              <div className={`${cardStyle.aspectRatio} bg-gradient-to-br ${cardStyle.gradientFrom} ${cardStyle.gradientTo} relative overflow-hidden critical-above-fold`} />
                              <div className="p-3">
                                <div className="text-sm font-semibold text-gray-900 line-clamp-1 leading-tight" role="heading" aria-level={3}>
                                  {itemTitle}
                                </div>
                              </div>
                            </button>
                          )}

                          {item.item && item.item.length > 0 && (
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/20">
                              <button 
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openPreview(item.name, item.item);
                                }}
                                className="pointer-events-auto opacity-0 group-hover:opacity-100 bg-white/90 text-gray-900 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ease-out transform translate-y-2 group-hover:translate-y-0 hover:bg-white will-change-transform"
                              >
                                {texts.preview}
                              </button>
                            </div>
                          )}

                            {/* 装饰性渐变边框 */}
                            <div className={`absolute inset-0 ${cardStyle.cardClass} bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none`}></div>
                        </article>
                      </div>
                    );
                    })}
                  </div>

                  {shouldShowViewAll && !isExpanded && (
                    <div className="mt-6 flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedCategories(prev => ({
                            ...prev,
                            [categoryKey]: true,
                          }));
                        }}
                        className="inline-flex items-center rounded-full border border-blue-200 bg-white px-5 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        {viewAllText}
                      </button>
                    </div>
                  )}

                </div>
              </section>
            </Fragment>
          );
        })}


        {/* 空状态处理 */}
        {tabData.length === 0 && (
          <section className="py-20 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-xl font-semibold text-gray-900 mb-2">{texts.noWallpapers}</p>
              <p className="text-gray-600">{texts.noWallpapersDescription}</p>
            </div>
          </section>
        )}
      </main>

      <Footer />

      {/* 壁纸预览模态框 */}
      <WallpaperPreviewDownload
        isOpen={isPreviewOpen}
        onClose={closePreview}
        wallpapers={previewWallpapers}
        currentIndex={previewIndex}
        onIndexChange={handlePreviewIndexChange}
        categoryName={previewCategory}
      />

      {/* 返回顶部按钮 - 预览时不显示 */}
      <button
        onClick={scrollToTop}
        className={`fixed right-6 bottom-6 z-50 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group ${
          showBackToTop && !isPreviewOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label="返回顶部"
      >
        <svg 
          className="w-6 h-6 transform group-hover:-translate-y-0.5 transition-transform duration-200" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2.5} 
            d="M5 10l7-7m0 0l7 7m-7-7v18" 
          />
        </svg>
      </button>
    </div>
  );
}
