'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCcw, RefreshCw, MoreHorizontal } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { formatWallpaperDisplayName } from '@/lib/data';
import { buildPublicR2Url } from '@/lib/r2-public-url';
import { analyticsAttributes, buildAnalyticsShareUrl, getWallpaperAnalyticsParams, trackAnalyticsEvent, type AnalyticsEventParams } from '@/lib/analytics';
import VideoWallpaperPlayer from '@/components/VideoWallpaperPlayer';
import WallpaperActionsSheet from '@/components/WallpaperActionsSheet';
import { createLongPress } from '@/lib/long-press';
import WallpaperTags from '@/components/WallpaperTags';

interface WallpaperItem {
  id?: string;
  category?: string;
  brand?: string;
  sourcePath?: string;
  collectionId?: string;
  width?: number | null;
  height?: number | null;
  tags?: string[];
  name: string;
  type: string;
  size: string;
  originPath: string;
  compressPath: string;
  tag: string;
}

interface WallpaperPreviewDownloadProps {
  analyticsContext?: AnalyticsEventParams;
  isOpen: boolean;
  onClose: () => void;
  wallpapers: WallpaperItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  categoryName: string;
}

export default function WallpaperPreviewDownload({
  isOpen,
  onClose,
  wallpapers,
  currentIndex,
  onIndexChange,
  categoryName,
  analyticsContext,
}: WallpaperPreviewDownloadProps) {
  // 使用 useLanguage hook 获取当前语言和多语言文本
  const { texts, language } = useLanguage();
  
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true); // 初始状态设为true，确保显示loading
  const [imageError, setImageError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const downloadInProgressRef = useRef(false);
  const [preloadedUrls, setPreloadedUrls] = useState<Record<string, string>>({});
  const [isPreloading, setIsPreloading] = useState(false);
  const [videoRefreshToken, setVideoRefreshToken] = useState(0);
  const [isVideoImmersive, setIsVideoImmersive] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const suppressMediaClickRef = useRef(false);
  const longPress = useMemo(() => createLongPress(() => {
    suppressMediaClickRef.current = true;
    setIsActionsOpen(true);
  }), []);
  const preloadedUrlsRef = useRef<Record<string, string>>({});

  const currentWallpaper = wallpapers[currentIndex];
  const analyticsParams = useMemo(() => currentWallpaper ? {
    ...getWallpaperAnalyticsParams(currentWallpaper, analyticsContext), position: currentIndex + 1,
  } : analyticsContext || {}, [currentWallpaper, analyticsContext, currentIndex]);
  const previewStartedAt = useRef(0);
  const previewReady = useRef(false);
  const handleMediaReady = useCallback(() => {
    if (previewReady.current) return;
    previewReady.current = true;
    trackAnalyticsEvent('w_preview_ready', { ...analyticsParams,
      load_ms: Math.round(performance.now() - previewStartedAt.current) });
  }, [analyticsParams]);

  useEffect(() => {
    if (!isOpen || !currentWallpaper) return;
    previewStartedAt.current = performance.now();
    previewReady.current = false;
    trackAnalyticsEvent('w_preview_view', analyticsParams);
    let visibleAt = document.visibilityState === 'visible' ? performance.now() : null;
    let visibleMs = 0;
    let ended = false;
    const visibility = () => {
      if (visibleAt !== null) visibleMs += performance.now() - visibleAt;
      visibleAt = document.visibilityState === 'visible' ? performance.now() : null;
    };
    const end = () => {
      if (ended) return;
      ended = true;
      if (visibleAt !== null) visibleMs += performance.now() - visibleAt;
      trackAnalyticsEvent('w_preview_end', { ...analyticsParams, duration_ms: Math.round(visibleMs),
        preview_loaded: previewReady.current });
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', end);
    return () => {
      end();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', end);
    };
  }, [isOpen, currentWallpaper, analyticsParams]);
  const displayCategoryName = formatWallpaperDisplayName(categoryName);
  const displayWallpaperName = currentWallpaper ? formatWallpaperDisplayName(currentWallpaper.name) : '';
  const isVideo = Boolean(currentWallpaper && (currentWallpaper.type.startsWith('video/') || /\.(mp4|webm)$/i.test(currentWallpaper.originPath)));
  const videoUrl = isVideo ? `/api/files/preview?key=${encodeURIComponent(currentWallpaper.originPath)}` : '';
  const showPreviewChrome = !isVideo || !isVideoImmersive;
  const closeActions = useCallback(() => setIsActionsOpen(false), []);
  const shareUrl = useMemo(() => {
    if (!isOpen || !currentWallpaper || typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    url.searchParams.set('wallpaper', currentWallpaper.name);
    url.hash = '';
    return buildAnalyticsShareUrl(url.toString(), 'wallpaper');
  }, [isOpen, currentWallpaper]);

  useEffect(() => {
    setIsActionsOpen(false);
    suppressMediaClickRef.current = false;
    longPress.cancel();
    return longPress.cancel;
  }, [isOpen, currentIndex, longPress]);

  useEffect(() => {
    if (!isOpen) setIsVideoImmersive(false);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const resolveImageUrls = useCallback(async (keys: string[]): Promise<Record<string, string>> => {
    const publicUrls = Object.fromEntries(
      keys
        .map((key) => [key, buildPublicR2Url(key)] as const)
        .filter((entry): entry is [string, string] => Boolean(entry[1]))
    );

    if (Object.keys(publicUrls).length === keys.length) {
      return publicUrls;
    }

    try {
      const response = await fetch('/api/files/batch-private-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keys,
        }),
      });

      if (!response.ok) {
        return {};
      }

      const data = (await response.json()) as { urls?: Record<string, string> };
      return data.urls || publicUrls;
    } catch (error) {
      console.error('Failed to generate batch private URLs:', error);
      return publicUrls;
    }
  }, []);

  const mergePreloadedUrls = useCallback((incoming: Record<string, string>) => {
    const entries = Object.entries(incoming).filter(([, value]) => Boolean(value));
    if (entries.length === 0) return;

    let hasChanges = false;
    const nextRef = { ...preloadedUrlsRef.current };

    entries.forEach(([key, value]) => {
      if (nextRef[key] !== value) {
        nextRef[key] = value;
        hasChanges = true;
      }
    });

    if (!hasChanges) return;

    preloadedUrlsRef.current = nextRef;
    setPreloadedUrls((prev) => {
      let changed = false;
      const next = { ...prev };
      entries.forEach(([key, value]) => {
        if (next[key] !== value) {
          next[key] = value;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, []);

  // 预加载预览图片 URL（只加载展示图，避免打开弹窗时请求量过大）
  useEffect(() => {
    if (!isOpen || wallpapers.length === 0) {
      setIsPreloading(false);
      preloadedUrlsRef.current = {};
      setPreloadedUrls({});
      return;
    }

    let cancelled = false;
    setIsPreloading(true);

    const preloadAllImages = async () => {
      const displayKeys = Array.from(
        new Set(
          wallpapers
            .map((wallpaper) => wallpaper.compressPath || wallpaper.originPath)
            .filter(Boolean)
        )
      );

      if (displayKeys.length === 0) {
        if (!cancelled) {
          setIsPreloading(false);
        }
        return;
      }

      const urls = await resolveImageUrls(displayKeys as string[]);
      if (cancelled) return;

      mergePreloadedUrls(urls);
      setIsPreloading(false);
    };

    preloadAllImages();

    return () => {
      cancelled = true;
    };
  }, [isOpen, mergePreloadedUrls, resolveImageUrls, wallpapers]);

  // 加载当前壁纸
  useEffect(() => {
    if (!isOpen || !currentWallpaper) {
      setCurrentImageUrl('');
      setImageError(false);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadImage = async () => {
      setCurrentImageUrl('');
      setIsLoading(true);
      setImageError(false);

      const displayPath = currentWallpaper.compressPath || currentWallpaper.originPath;
      let url = preloadedUrlsRef.current[displayPath];

      if (!url) {
        const urls = await resolveImageUrls([displayPath]);
        if (cancelled) return;

        url = urls[displayPath] || '';
        if (url) {
          mergePreloadedUrls({ [displayPath]: url });
        }
      }

      if (cancelled) return;

      if (!url) {
        if (!currentWallpaper.type.startsWith('video/')) trackAnalyticsEvent('w_media_error', {
          ...analyticsParams, media_location: 'preview', error_code: 'preview_url',
        });
        setImageError(true);
        setIsLoading(false);
        return;
      }

      setCurrentImageUrl(url);
      setIsLoading(false);
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [analyticsParams, currentWallpaper, isOpen, mergePreloadedUrls, resolveImageUrls]);

  // 切换到上一张
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      trackAnalyticsEvent('w_preview_navigate', {
        ...getWallpaperAnalyticsParams(wallpapers[nextIndex], analyticsContext), position: nextIndex + 1,
        direction: 'previous',
        category_name: categoryName,
        wallpaper_name: wallpapers[nextIndex]?.name,
      });
      onIndexChange(nextIndex);
    }
  }, [analyticsContext, categoryName, currentIndex, onIndexChange, wallpapers]);

  // 切换到下一张
  const goToNext = useCallback(() => {
    if (currentIndex < wallpapers.length - 1) {
      const nextIndex = currentIndex + 1;
      trackAnalyticsEvent('w_preview_navigate', {
        ...getWallpaperAnalyticsParams(wallpapers[nextIndex], analyticsContext), position: nextIndex + 1,
        direction: 'next',
        category_name: categoryName,
        wallpaper_name: wallpapers[nextIndex]?.name,
      });
      onIndexChange(nextIndex);
    }
  }, [analyticsContext, categoryName, currentIndex, onIndexChange, wallpapers]);

  // 实际执行下载
  const downloadWallpaper = useCallback(async () => {
    if (!currentWallpaper || downloadInProgressRef.current) return;

    // Lock synchronously so rapid clicks cannot race React's state update.
    downloadInProgressRef.current = true;
    setIsDownloading(true);
    let downloadRequestId: string | undefined;
    try { downloadRequestId = globalThis.crypto?.randomUUID?.(); } catch { /* Correlation must not block downloads. */ }

    try {
      trackAnalyticsEvent('w_wallpaper_download_click', {
        ...analyticsParams,
        download_request_id: downloadRequestId,
        category_name: categoryName,
        wallpaper_name: currentWallpaper.name,
        file_type: currentWallpaper.type,
        file_size: currentWallpaper.size,
      });
      // 使用服务器端代理下载，避免CORS问题
      const downloadUrl = `/api/files/download?key=${encodeURIComponent(currentWallpaper.originPath)}${downloadRequestId ? `&download_request_id=${downloadRequestId}` : ''}`;

      // Hand off inside the click gesture: the browser streams originals to disk,
      // shows its download progress and avoids buffering large images in mobile memory.
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = currentWallpaper.originPath.split('/').pop() || 'wallpaper';
      link.style.display = 'none';
      document.body.appendChild(link);
      try {
        link.click();
      } finally {
        link.remove();
      }
      // A browser-managed download has no completion callback. Record the handoff
      // without claiming that the file has finished downloading or been saved.
      trackAnalyticsEvent('w_wallpaper_download_started', {
        ...analyticsParams,
        download_request_id: downloadRequestId,
        category_name: categoryName,
        wallpaper_name: currentWallpaper.name,
        file_type: currentWallpaper.type,
        file_size: currentWallpaper.size,
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Download failed:', error);
      trackAnalyticsEvent('w_wallpaper_download_fail', {
        ...analyticsParams, error_code: 'download_handoff',
        download_request_id: downloadRequestId,
        category_name: categoryName,
        wallpaper_name: currentWallpaper.name,
        file_type: currentWallpaper.type,
        file_size: currentWallpaper.size,
      });
      alert(texts.downloadFailed + '\n\n' + texts.errorDetails + ': ' + (error instanceof Error ? error.message : texts.unknownError));
    } finally {
      downloadInProgressRef.current = false;
      setIsDownloading(false);
    }
  }, [
    analyticsParams,
    categoryName,
    currentWallpaper,
    texts.downloadFailed,
    texts.errorDetails,
    texts.unknownError,
  ]);

  // 处理下载按钮点击
  const handleDownloadClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentWallpaper || isDownloading || (!isVideo && (!currentImageUrl || isLoading))) {
      return;
    }

    void downloadWallpaper();
  }, [currentWallpaper, currentImageUrl, downloadWallpaper, isDownloading, isLoading, isVideo]);

  // 缩放功能
  const handleZoomIn = useCallback(() => {
    const nextZoom = Math.min(zoomLevel + 0.5, 3);
    trackAnalyticsEvent('w_preview_zoom', {
      ...analyticsParams,
      action: 'zoom_in',
      zoom_level: nextZoom,
      wallpaper_name: currentWallpaper?.name,
    });
    setZoomLevel(nextZoom);
  }, [analyticsParams, currentWallpaper, zoomLevel]);

  const handleZoomOut = useCallback(() => {
    const nextZoom = Math.max(zoomLevel - 0.5, 0.5);
    trackAnalyticsEvent('w_preview_zoom', {
      ...analyticsParams,
      action: 'zoom_out',
      zoom_level: nextZoom,
      wallpaper_name: currentWallpaper?.name,
    });
    setZoomLevel(nextZoom);
  }, [analyticsParams, currentWallpaper, zoomLevel]);

  const handleResetZoom = useCallback(() => {
    trackAnalyticsEvent('w_preview_zoom', {
      ...analyticsParams,
      action: 'reset',
      zoom_level: 1,
      wallpaper_name: currentWallpaper?.name,
    });
    setZoomLevel(1);
  }, [analyticsParams, currentWallpaper]);

  // 刷新当前图片
  const handleRefreshImage = useCallback(async () => {
    if (!currentWallpaper || !isOpen) return;

    trackAnalyticsEvent('w_preview_refresh', {
      ...analyticsParams,
      category_name: categoryName,
      wallpaper_name: currentWallpaper.name,
    });

    if (isVideo) {
      setVideoRefreshToken(value => value + 1);
      return;
    }

    const displayPath = currentWallpaper.compressPath || currentWallpaper.originPath;

    setIsLoading(true);
    setImageError(false);
    setCurrentImageUrl('');

    const urls = await resolveImageUrls([displayPath]);
    const refreshedUrl = urls[displayPath] || preloadedUrlsRef.current[displayPath] || '';

    if (!refreshedUrl) {
      setImageError(true);
      setIsLoading(false);
      return;
    }

    mergePreloadedUrls({ [displayPath]: refreshedUrl });
    setCurrentImageUrl(refreshedUrl);
    setIsLoading(false);
  }, [analyticsParams, categoryName, currentWallpaper, isOpen, mergePreloadedUrls, resolveImageUrls, isVideo]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (isActionsOpen) return;
      if (e.target instanceof HTMLElement && e.target.closest('video') && !['Escape', 'h', 'H'].includes(e.key)) return;
      if (e.key === 'Escape' && document.fullscreenElement) return;
      
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          goToPrevious();
          break;
        case 'ArrowRight':
          e.preventDefault();
          goToNext();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          handleResetZoom();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          handleRefreshImage();
          break;
        case 'h':
        case 'H':
          if (isVideo) {
            e.preventDefault();
            setIsVideoImmersive(value => !value);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, handleClose, handleRefreshImage, handleResetZoom, handleZoomIn, handleZoomOut, isOpen, isVideo, isActionsOpen]);

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label={displayCategoryName} className="fixed inset-0 z-50 bg-black"
      {...analyticsAttributes(analyticsParams)}>
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black"
        onClick={handleClose}
      ></div>

      {/* 模态框内容 - Google Photos 风格 */}
      <div className={`relative w-full flex flex-col ${isVideo ? 'h-[100dvh]' : 'h-full'}`}>
        {/* 顶部工具栏 - 简洁设计 */}
        {showPreviewChrome && <div className={isVideo ? 'relative z-10 shrink-0 bg-gradient-to-b from-black/50 to-transparent' : 'absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent'}>
          {/* 移动端简化工具栏 */}
          <div className="md:hidden flex items-center justify-between p-2">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <div className="text-white text-sm truncate max-w-[150px]">
                <h2 className="font-medium truncate">{displayCategoryName}</h2>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button type="button" onClick={() => setIsActionsOpen(true)} aria-label={texts.wallpaperActions} aria-haspopup="dialog"
                className="rounded-full p-2 text-white transition-colors hover:bg-white/10">
                <MoreHorizontal className="h-5 w-5" />
              </button>
              <button
                onClick={handleDownloadClick}
                aria-label={texts.downloadWallpaper}
                aria-busy={isDownloading}
                disabled={isDownloading || (!isVideo && (!currentImageUrl || isLoading))}
                className="p-2 hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
              >
                {isDownloading ? (
                  <span className="inline-flex items-center justify-center w-5 h-5">
                    <span className="w-4.5 h-4.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  </span>
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          
          {/* 桌面端完整工具栏 */}
          <div className="hidden md:flex items-center justify-between p-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <div className="text-white">
                <h2 className="text-lg font-medium">{displayCategoryName}</h2>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button type="button" onClick={() => setIsActionsOpen(true)} aria-label={texts.wallpaperActions} aria-haspopup="dialog"
                className="rounded-full p-2 text-white transition-colors hover:bg-white/10">
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {/* 缩放控件 */}
              {!isVideo && <div className="flex items-center space-x-1 bg-black/30 rounded-full p-1">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 0.5}
                  className="p-2 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-white/70 px-2 min-w-[3rem] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3}
                  className="p-2 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="p-2 hover:bg-white/10 text-white rounded-full transition-colors"
                  title={texts.resetZoom}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>}
              
              {/* 刷新按钮 */}
              <button
                onClick={handleRefreshImage}
                disabled={!isVideo && (isLoading || isPreloading)}
                className="p-2 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-colors"
                title={isVideo ? texts.retryVideo : texts.refreshImage}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={handleDownloadClick}
                aria-busy={isDownloading}
                disabled={isDownloading || (!isVideo && (!currentImageUrl || isLoading))}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-30 text-white/80 hover:text-white rounded-full transition-all duration-200 text-xs"
              >
                {isDownloading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span className="font-normal">
                  {isDownloading ? texts.downloading : texts.downloadWallpaper}
                </span>
              </button>
              
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>}

        {/* 主要内容区域 - 全屏图片展示 */}
        <div className={`flex-1 relative flex items-center justify-center overflow-hidden ${isVideo ? 'min-h-0 px-2' : 'p-2 md:p-4'}`}>
          {/* 图片容器 - 根据设备类型决定显示方式 */}
          <div
            style={{ WebkitTouchCallout: 'none', userSelect: 'none' }}
            onPointerDownCapture={(event) => {
              suppressMediaClickRef.current = false;
              if (!event.isPrimary) { longPress.cancel(); return; }
              if (event.button !== 0 || !(event.target instanceof HTMLElement)) return;
              const media = event.target.closest('img, video');
              if (!media || isActionsOpen) return;
              // Leave the native video controls available for seeking and fullscreen.
              if (media instanceof HTMLVideoElement && media.controls && event.clientY > media.getBoundingClientRect().bottom - 64) return;
              longPress.start(event.pointerId, event.clientX, event.clientY);
            }}
            onPointerMoveCapture={(event) => longPress.move(event.pointerId, event.clientX, event.clientY)}
            onPointerUpCapture={() => longPress.cancel()}
            onPointerCancelCapture={() => longPress.cancel()}
            onPointerLeave={() => longPress.cancel()}
            onClickCapture={(event) => {
              if (suppressMediaClickRef.current) {
                event.preventDefault();
                event.stopPropagation();
                suppressMediaClickRef.current = false;
              }
            }}
            onContextMenu={(event) => {
              if (!(event.target instanceof HTMLElement) || !event.target.closest('img, video')) return;
              event.preventDefault();
              longPress.cancel();
              suppressMediaClickRef.current = true;
              setIsActionsOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                event.preventDefault();
                setIsActionsOpen(true);
              }
            }}
            className={`w-full flex items-center justify-center relative ${
            isVideo ? (isVideoImmersive ? 'h-full' : 'h-full max-w-sm max-h-[80dvh] aspect-[9/16]') : categoryName.toLowerCase().includes('iphone')
              ? 'max-w-sm max-h-[80vh] aspect-[9/16]'  // iPhone强制竖屏
              : 'max-w-4xl max-h-[80vh]'  // 其他设备按原方向显示
          }`}>
            {isVideo ? (
              <VideoWallpaperPlayer key={`${videoUrl}-${videoRefreshToken}`} url={videoUrl} poster={currentImageUrl}
                analyticsParams={analyticsParams} onReady={handleMediaReady}
                label={displayWallpaperName} refreshToken={videoRefreshToken} immersive={isVideoImmersive}
                onToggleImmersive={() => setIsVideoImmersive(value => !value)} />
            ) : isLoading ? (
              <div className="flex items-center justify-center">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            ) : imageError ? (
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-white/70 font-medium">{texts.imageLoadFailed}</p>
                </div>
              </div>
            ) : currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt={displayWallpaperName}
                draggable={false}
                tabIndex={0}
                className={`transition-all duration-300 ease-out ${
                  categoryName.toLowerCase().includes('iphone')
                    ? 'w-full h-full object-cover'  // iPhone强制填满竖屏容器
                    : 'max-w-full max-h-[80vh] w-auto h-auto object-contain'  // 其他设备按原比例显示
                }`}
                style={{ 
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center',
                  opacity: 1,
                  animation: 'imageFadeIn 0.3s ease-out'
                }}
                onLoad={handleMediaReady}
                onError={() => {
                  setImageError(true);
                  trackAnalyticsEvent('w_media_error', { ...analyticsParams, media_location: 'preview', error_code: 'image_load' });
                }}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <div className="text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-white/70 font-medium">{texts.imageLoading}</p>
                </div>
              </div>
            )}

            {/* 导航按钮 - Google Photos 风格 */}
            {wallpapers.length > 1 && showPreviewChrome && (
              <>
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  aria-label={texts.previousWallpaper}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-all duration-200 backdrop-blur-sm"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentIndex === wallpapers.length - 1}
                  aria-label={texts.nextWallpaper}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-all duration-200 backdrop-blur-sm"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 底部信息面板 - Google Photos 风格 */}
        {showPreviewChrome && <div className={isVideo ? 'relative z-10 shrink-0 bg-gradient-to-t from-black/80 to-transparent' : 'absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent'}>
          <div className={isVideo ? 'px-4 py-3 md:px-6' : 'p-6'}>
            {/* 壁纸信息 */}
            <div className="text-white mb-4">
              <div className="min-w-0">
              <h3 className="text-lg font-medium mb-1 truncate" title={displayWallpaperName}>{displayWallpaperName}</h3>
              <div className="flex items-center space-x-4 text-white/70 text-sm">
                <span>{currentWallpaper?.size}</span>
                <span>•</span>
                <span>{currentWallpaper?.type}</span>
              </div>
              <div className="max-h-24 overflow-y-auto">
                <WallpaperTags tags={currentWallpaper?.tags || (currentWallpaper?.tag ? [currentWallpaper.tag] : [])} language={language} dark />
              </div>
              </div>
            </div>

            {/* 缩略图导航 - 水平滚动 */}
            {wallpapers.length > 1 && (
              <div className={`flex space-x-2 overflow-x-auto pb-2 ${isVideo ? 'pr-20' : ''}`}>
                {wallpapers.map((wallpaper, index) => {
                  const thumbnailPath = wallpaper.compressPath || wallpaper.originPath;
                  const thumbnailUrl = preloadedUrls[thumbnailPath];
                  
                  return (
                    <button
                      key={index}
                      onClick={() => onIndexChange(index)}
                      aria-label={`${texts.preview} ${formatWallpaperDisplayName(wallpaper.name)}`}
                      aria-pressed={index === currentIndex}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        index === currentIndex
                          ? 'border-white shadow-lg'
                          : 'border-white/30 hover:border-white/60'
                      }`}
                    >
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={formatWallpaperDisplayName(wallpaper.name)}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/10 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">
                            {index + 1}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>}

        {/* 右下角计数器 */}
        {showPreviewChrome && <div className="pointer-events-none absolute bottom-4 right-4 z-10">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-sm text-white font-medium tracking-wide">
              {currentIndex + 1} / {wallpapers.length}
            </span>
          </div>
        </div>}
      </div>
      {isActionsOpen && currentWallpaper && (
        <WallpaperActionsSheet title={displayWallpaperName} previewImageUrl={currentImageUrl} shareUrl={shareUrl}
          analyticsParams={analyticsParams}
          downloadDisabled={isDownloading || (!isVideo && (!currentImageUrl || isLoading || imageError))}
          isDownloading={isDownloading}
          onDownload={handleDownloadClick} onClose={closeActions} />
      )}
    </div>
  );
}
