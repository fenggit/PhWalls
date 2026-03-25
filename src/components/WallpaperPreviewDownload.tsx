'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, RotateCcw, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { analytics } from '@/lib/analytics';

interface WallpaperItem {
  name: string;
  type: string;
  size: string;
  originPath: string;
  compressPath: string;
  tag: string;
}

interface WallpaperPreviewDownloadProps {
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
  categoryName
}: WallpaperPreviewDownloadProps) {
  // 使用 useLanguage hook 获取当前语言和多语言文本
  const { texts } = useLanguage();
  
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true); // 初始状态设为true，确保显示loading
  const [imageError, setImageError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);
  const [preloadedUrls, setPreloadedUrls] = useState<Record<string, string>>({});
  const [isPreloading, setIsPreloading] = useState(false);
  const preloadedUrlsRef = useRef<Record<string, string>>({});

  const currentWallpaper = wallpapers[currentIndex];

  const getWallpaperParams = useCallback(() => ({
    categoryName,
    wallpaperName: currentWallpaper?.name,
  }), [categoryName, currentWallpaper?.name]);

  const handleClose = useCallback(() => {
    analytics.previewWallpaper({
      action: 'close',
      wallpaperName: currentWallpaper?.name,
    });
    onClose();
  }, [currentWallpaper?.name, onClose]);

  // 批量生成私有URL
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

      const urls = await generateBatchPrivateUrls(displayKeys as string[]);
      if (cancelled) return;

      mergePreloadedUrls(urls);
      setIsPreloading(false);
    };

    preloadAllImages();

    return () => {
      cancelled = true;
    };
  }, [isOpen, wallpapers, generateBatchPrivateUrls, mergePreloadedUrls]);

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
        const urls = await generateBatchPrivateUrls([displayPath]);
        if (cancelled) return;

        url = urls[displayPath] || '';
        if (url) {
          mergePreloadedUrls({ [displayPath]: url });
        }
      }

      if (cancelled) return;

      if (!url) {
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
  }, [currentWallpaper, generateBatchPrivateUrls, isOpen, mergePreloadedUrls]);

  // 切换到上一张
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      analytics.previewNavigate({
        wallpaperName: wallpapers[nextIndex]?.name,
      });
      onIndexChange(nextIndex);
    }
  }, [currentIndex, onIndexChange, wallpapers]);

  // 切换到下一张
  const goToNext = useCallback(() => {
    if (currentIndex < wallpapers.length - 1) {
      const nextIndex = currentIndex + 1;
      analytics.previewNavigate({
        wallpaperName: wallpapers[nextIndex]?.name,
      });
      onIndexChange(nextIndex);
    }
  }, [currentIndex, onIndexChange, wallpapers]);

  // 实际执行下载
  const downloadWallpaper = useCallback(async () => {
    if (!currentWallpaper || isDownloading) return;

    setIsDownloading(true);

    try {
      // 使用服务器端代理下载，避免CORS问题
      const downloadUrl = `/api/files/download?key=${encodeURIComponent(currentWallpaper.originPath)}`;

      // 使用fetch获取文件
      const fileResponse = await fetch(downloadUrl);

      if (!fileResponse.ok) {
        throw new Error(`${texts.downloadFailed}: ${fileResponse.status} ${fileResponse.statusText}`);
      }

      // 获取文件blob
      const blob = await fileResponse.blob();

      // 从响应头获取文件名，如果没有则使用默认名称
      const contentDisposition = fileResponse.headers.get('content-disposition');
      let filename = currentWallpaper.name || 'download';

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          // 处理UTF-8编码的文件名
          const matchedFilename = filenameMatch[1].replace(/['"]/g, '');
          if (matchedFilename.startsWith("UTF-8''")) {
            filename = decodeURIComponent(matchedFilename.substring(7));
          } else {
            filename = matchedFilename;
          }
        }
      }

      // 创建下载链接
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      analytics.downloadSuccess({
        ...getWallpaperParams(),
      });

      // 延迟释放blob URL，确保下载完成
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      analytics.downloadFail({
        categoryName,
        wallpaperName: currentWallpaper?.name,
      });
      console.error('Download failed:', error);
      alert(texts.downloadFailed + '\n\n' + texts.errorDetails + ': ' + (error instanceof Error ? error.message : texts.unknownError));
    } finally {
      setIsDownloading(false);
    }
  }, [categoryName, currentWallpaper, getWallpaperParams, isDownloading, texts.downloadFailed, texts.errorDetails, texts.unknownError]);

  // 处理下载按钮点击
  const handleDownloadClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentWallpaper || isDownloading || !currentImageUrl || isLoading) {
      return;
    }

    analytics.downloadClick({
      wallpaperName: currentWallpaper?.name,
    });
    downloadWallpaper();
  }, [currentWallpaper, currentImageUrl, downloadWallpaper, isDownloading, isLoading]);

  // 缩放功能
  const handleZoomIn = useCallback(() => {
    const nextZoom = Math.min(zoomLevel + 0.5, 3);
    setZoomLevel(nextZoom);
    analytics.previewZoom({
      zoomLevel: nextZoom,
      wallpaperName: currentWallpaper?.name,
    });
  }, [currentWallpaper?.name, zoomLevel]);

  const handleZoomOut = useCallback(() => {
    const nextZoom = Math.max(zoomLevel - 0.5, 0.5);
    setZoomLevel(nextZoom);
    analytics.previewZoom({
      zoomLevel: nextZoom,
      wallpaperName: currentWallpaper?.name,
    });
  }, [currentWallpaper?.name, zoomLevel]);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    analytics.previewZoom({
      zoomLevel: 1,
      wallpaperName: currentWallpaper?.name,
    });
  }, [currentWallpaper?.name]);

  // 刷新当前图片
  const handleRefreshImage = useCallback(async () => {
    if (!currentWallpaper || !isOpen) return;

    analytics.previewRefresh({ wallpaperName: currentWallpaper?.name });

    const displayPath = currentWallpaper.compressPath || currentWallpaper.originPath;

    setIsLoading(true);
    setImageError(false);
    setCurrentImageUrl('');

    const urls = await generateBatchPrivateUrls([displayPath]);
    const refreshedUrl = urls[displayPath] || preloadedUrlsRef.current[displayPath] || '';

    if (!refreshedUrl) {
      setImageError(true);
      setIsLoading(false);
      return;
    }

    mergePreloadedUrls({ [displayPath]: refreshedUrl });
    setCurrentImageUrl(refreshedUrl);
    setIsLoading(false);
  }, [currentWallpaper, generateBatchPrivateUrls, isOpen, mergePreloadedUrls]);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
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
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrevious, handleClose, handleRefreshImage, handleResetZoom, handleZoomIn, handleZoomOut, isOpen]);

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
    <div className="fixed inset-0 z-50 bg-black">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black"
        onClick={handleClose}
      ></div>

      {/* 模态框内容 - Google Photos 风格 */}
      <div className="relative w-full h-full flex flex-col">
        {/* 顶部工具栏 - 简洁设计 */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/50 to-transparent">
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
                <h2 className="font-medium truncate">{categoryName}</h2>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={handleDownloadClick}
                disabled={!currentImageUrl || isLoading || isDownloading}
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
                <h2 className="text-lg font-medium">{categoryName}</h2>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* 缩放控件 */}
              <div className="flex items-center space-x-1 bg-black/30 rounded-full p-1">
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
              </div>
              
              {/* 刷新按钮 */}
              <button
                onClick={handleRefreshImage}
                disabled={isLoading || isPreloading}
                className="p-2 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-colors"
                title={texts.refreshImage}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={handleDownloadClick}
                disabled={!currentImageUrl || isLoading || isDownloading}
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
        </div>

        {/* 主要内容区域 - 全屏图片展示 */}
        <div className="flex-1 relative flex items-center justify-center p-2 md:p-4 overflow-hidden">
          {/* 图片容器 - 根据设备类型决定显示方式 */}
          <div className={`w-full flex items-center justify-center relative ${
            categoryName.toLowerCase().includes('iphone') 
              ? 'max-w-sm max-h-[80vh] aspect-[9/16]'  // iPhone强制竖屏
              : 'max-w-4xl max-h-[80vh]'  // 其他设备按原方向显示
          }`}>
            {isLoading ? (
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
                alt={currentWallpaper?.name}
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
                onError={() => setImageError(true)}
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
            {wallpapers.length > 1 && (
              <>
                <button
                  onClick={goToPrevious}
                  disabled={currentIndex === 0}
                  className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-all duration-200 backdrop-blur-sm"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={goToNext}
                  disabled={currentIndex === wallpapers.length - 1}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-full transition-all duration-200 backdrop-blur-sm"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* 底部信息面板 - Google Photos 风格 */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent">
          <div className="p-6">
            {/* 壁纸信息 */}
            <div className="text-white mb-4">
              <h3 className="text-lg font-medium mb-1">{currentWallpaper?.name}</h3>
              <div className="flex items-center space-x-4 text-sm text-white/70">
                <span>{currentWallpaper?.size}</span>
                <span>•</span>
                <span>{currentWallpaper?.type}</span>
              </div>
            </div>

            {/* 缩略图导航 - 水平滚动 */}
            {wallpapers.length > 1 && (
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {wallpapers.map((wallpaper, index) => {
                  const thumbnailPath = wallpaper.compressPath || wallpaper.originPath;
                  const thumbnailUrl = preloadedUrls[thumbnailPath];
                  
                  return (
                    <button
                      key={index}
                      onClick={() => onIndexChange(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                        index === currentIndex
                          ? 'border-white shadow-lg'
                          : 'border-white/30 hover:border-white/60'
                      }`}
                    >
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={wallpaper.name}
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
        </div>

        {/* 右下角计数器 */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-sm text-white font-medium tracking-wide">
              {currentIndex + 1} / {wallpapers.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
