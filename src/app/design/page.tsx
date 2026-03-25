'use client';

// Cloudflare Pages 部署必需，请勿删除
export const runtime = 'edge';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import { withLanguagePath } from '@/lib/language';
import BackNavButton from '@/components/BackNavButton';
import Script from 'next/script';
import { analytics } from '@/lib/analytics';

// 预设壁纸数据
const presetWallpapers = [
  {
    id: 1,
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    hexColor: '#667eea',
    name: 'Purple Dream'
  },
  {
    id: 2,
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    hexColor: '#f093fb',
    name: 'Pink Sunset'
  },
  {
    id: 3,
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    hexColor: '#4facfe',
    name: 'Blue Ocean'
  },
  {
    id: 4,
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    hexColor: '#43e97b',
    name: 'Green Mint'
  },
  {
    id: 5,
    color: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    hexColor: '#fa709a',
    name: 'Warm Sunrise'
  },
  {
    id: 6,
    color: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    hexColor: '#30cfd0',
    name: 'Deep Sea'
  },
  {
    id: 7,
    color: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    hexColor: '#a8edea',
    name: 'Soft Pastel'
  },
  {
    id: 8,
    color: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    hexColor: '#ff9a9e',
    name: 'Rose Gold'
  },
  {
    id: 9,
    color: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
    hexColor: '#ffecd2',
    name: 'Peach Cream'
  },
  {
    id: 10,
    color: 'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
    hexColor: '#ff6e7f',
    name: 'Cotton Candy'
  },
  {
    id: 11,
    color: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
    hexColor: '#e0c3fc',
    name: 'Lavender Sky'
  },
  {
    id: 12,
    color: 'linear-gradient(135deg, #f8b500 0%, #fceabb 100%)',
    hexColor: '#f8b500',
    name: 'Golden Hour'
  },
];

// 设备类型和尺寸配置
type DeviceType = 'iphone' | 'ipad' | 'imac';

interface DeviceConfig {
  nameKey: 'iphone' | 'ipad' | 'imac';
  width: number;
  height: number;
  aspectRatio: string;
}

const deviceConfigs: Record<DeviceType, DeviceConfig> = {
  iphone: {
    nameKey: 'iphone',
    width: 1290,
    height: 2796,
    aspectRatio: 'aspect-[1290/2796]'
  },
  ipad: {
    nameKey: 'ipad',
    width: 2048,
    height: 2732,
    aspectRatio: 'aspect-[2048/2732]'
  },
  imac: {
    nameKey: 'imac',
    width: 5120,
    height: 2880,
    aspectRatio: 'aspect-[16/9]'
  }
};

// Apple logo SVG
const AppleLogo = ({ color = '#000000' }: { color?: string }) => (
  <svg viewBox="0 0 24 24" fill={color} className="w-full h-full">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

function DesignPageContent() {
  const { language: currentLang, texts } = useLanguage();
  const homeHref = withLanguagePath('/', currentLang);

  const [deviceType, setDeviceType] = useState<DeviceType>('imac');
  const [selectedWallpaper, setSelectedWallpaper] = useState(presetWallpapers[0]);
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [customColor, setCustomColor] = useState(presetWallpapers[0].hexColor);
  const [logoColor, setLogoColor] = useState('#ffffff');
  const [logoSize, setLogoSize] = useState(120);
  const [logoPosition, setLogoPosition] = useState({ x: 50, y: 50 });
  const [wallpaperSize, setWallpaperSize] = useState({ width: 0, height: 0 });
  const [useCustomSize, setUseCustomSize] = useState(false);
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDeviceTypeChange = (type: DeviceType) => {
    if (type !== deviceType) {
      analytics.designDeviceChange({ deviceType: type });
    }
    setDeviceType(type);
  };

  const handlePresetSelect = (wallpaper: (typeof presetWallpapers)[number]) => {
    analytics.designPresetSelect({
      presetId: wallpaper.id,
      presetName: wallpaper.name,
    });
    setSelectedWallpaper(wallpaper);
    setCustomColor(wallpaper.hexColor);
    setUseCustomColor(false);
  };

  const handleCustomColorChange = (value: string) => {
    setCustomColor(value);
    setUseCustomColor(true);
    analytics.designCustomColorSet({ colorHex: value });
  };

  const handleCustomSizeToggle = (enabled: boolean) => {
    setUseCustomSize(enabled);
    analytics.designCustomSizeToggle({ enabled });
  };

  // 初始化壁纸大小
  useEffect(() => {
    const device = deviceConfigs[deviceType];
    setWallpaperSize({ width: device.width, height: device.height });
  }, [deviceType]);

  // 获取当前背景
  const getCurrentBackground = () => {
    if (useCustomColor) {
      return customColor;
    }
    return selectedWallpaper.color;
  };

  // 处理宽度变化
  const handleWidthChange = (newWidth: number) => {
    // 确保宽度在有效范围内
    const clampedWidth = Math.max(100, Math.min(8000, newWidth));
    
    if (maintainAspectRatio) {
      const device = deviceConfigs[deviceType];
      const aspectRatio = device.width / device.height;
      const nextSize = { width: clampedWidth, height: Math.round(clampedWidth / aspectRatio) };
      setWallpaperSize(nextSize);
      analytics.designSizeChange({
        width: nextSize.width,
        height: nextSize.height,
        maintainAspect: true,
      });
    } else {
      const nextSize = { ...wallpaperSize, width: clampedWidth };
      setWallpaperSize(nextSize);
      analytics.designSizeChange({
        width: nextSize.width,
        height: nextSize.height,
        maintainAspect: false,
      });
    }
  };

  // 处理高度变化
  const handleHeightChange = (newHeight: number) => {
    // 确保高度在有效范围内
    const clampedHeight = Math.max(100, Math.min(8000, newHeight));
    
    if (maintainAspectRatio) {
      const device = deviceConfigs[deviceType];
      const aspectRatio = device.width / device.height;
      const nextSize = { width: Math.round(clampedHeight * aspectRatio), height: clampedHeight };
      setWallpaperSize(nextSize);
      analytics.designSizeChange({
        width: nextSize.width,
        height: nextSize.height,
        maintainAspect: true,
      });
    } else {
      const nextSize = { ...wallpaperSize, height: clampedHeight };
      setWallpaperSize(nextSize);
      analytics.designSizeChange({
        width: nextSize.width,
        height: nextSize.height,
        maintainAspect: false,
      });
    }
  };

  // 重置到原始大小
  const resetToOriginalSize = () => {
    const device = deviceConfigs[deviceType];
    setWallpaperSize({ width: device.width, height: device.height });
    setUseCustomSize(false);
  };

  // 处理保持宽高比开关变化
  const handleMaintainAspectRatioChange = (newValue: boolean) => {
    setMaintainAspectRatio(newValue);
    analytics.designAspectToggle({ enabled: newValue });
    if (newValue) {
      // 如果启用保持宽高比，以当前宽度为准重新计算高度
      const device = deviceConfigs[deviceType];
      const aspectRatio = device.width / device.height;
      setWallpaperSize({ 
        width: wallpaperSize.width, 
        height: Math.round(wallpaperSize.width / aspectRatio) 
      });
    }
  };

  const localizedFeatureList = [
    texts.customWallpaper,
    `${texts.iphone} ${texts.customWallpaper}`,
    `${texts.ipad} ${texts.customWallpaper}`,
    `${texts.imac} ${texts.customWallpaper}`,
    texts.presetGradients,
    texts.appleLogo,
    texts.downloadYourDesign,
  ];

  const localizedA11y = {
    nav: texts.mainNavigationLabel,
    preview: texts.wallpaperPreviewLabel,
    controls: texts.wallpaperCustomizationControlsLabel,
  };

  // 下载壁纸
  const handleDownload = async () => {
    const device = deviceConfigs[deviceType];
    const finalWidth = useCustomSize ? wallpaperSize.width : device.width;
    const finalHeight = useCustomSize ? wallpaperSize.height : device.height;
    analytics.designDownload({
      deviceType,
      width: finalWidth,
      height: finalHeight,
      useCustomSize,
      useCustomColor,
      presetId: selectedWallpaper.id,
      presetName: selectedWallpaper.name,
    });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 根据设备类型或自定义大小设置画布尺寸
    canvas.width = finalWidth;
    canvas.height = finalHeight;

    // 绘制背景
    const background = getCurrentBackground();
    if (background.startsWith('linear-gradient')) {
      // 解析渐变
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      // 简单处理渐变色（实际应用中可能需要更复杂的解析）
      const colors = background.match(/#[0-9a-f]{6}/gi);
      if (colors && colors.length >= 2) {
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
      }
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = background;
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制 logo
    if (canvasRef.current) {
      const logoSvg = `
        <svg viewBox="0 0 24 24" fill="${logoColor}" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
        </svg>
      `;
      
      const img = new Image();
      const svgBlob = new Blob([logoSvg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        const logoSizePixels = (logoSize / 100) * finalWidth * 0.3;
        const x = (logoPosition.x / 100) * finalWidth - logoSizePixels / 2;
        const y = (logoPosition.y / 100) * finalHeight - logoSizePixels / 2;
        ctx.drawImage(img, x, y, logoSizePixels, logoSizePixels);
        
        // 下载图片
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `apple-wallpaper-${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        });
        
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    } else {
      // 直接下载（无logo）
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `apple-wallpaper-${Date.now()}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    }
  };

    // 结构化数据
    const structuredData = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: texts.customWallpaperTitle,
      description: texts.customWallpaperDescription,
      applicationCategory: 'DesignApplication',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      operatingSystem: 'Web Browser',
      browserRequirements: 'Requires JavaScript. Requires HTML5.',
      featureList: localizedFeatureList,
    };

    return (
      <>
        {/* 结构化数据 */}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-900">
          {/* 导航栏 */}
          <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm" role="navigation" aria-label={localizedA11y.nav}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              {/* 左侧：返回 + 标题 */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <BackNavButton homeHref={homeHref} label={texts.returnHome} />
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">
                  {texts.customWallpaper}
                </h1>
              </div>
            </div>
          </div>
        </nav>


        {/* 主要内容区域 */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-24">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
            {/* 左侧：预览区域 */}
            <section className="lg:col-span-7 order-2 lg:order-1" aria-label={localizedA11y.preview}>
              <div className="sticky top-24">
                {/* 预览标签和设备选择 */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">{texts.preview}</span>
                  
                  <div className="flex items-center gap-4">
                    {/* 设备选择 - 分段控制器 */}
                    <div className="inline-flex items-center bg-gray-100 rounded-lg p-0.5">
                      {(Object.keys(deviceConfigs) as DeviceType[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => handleDeviceTypeChange(type)}
                          className={`relative px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
                            deviceType === type
                              ? 'text-gray-900'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {deviceType === type && (
                            <div className="absolute inset-0 bg-white rounded-md shadow-sm"></div>
                          )}
                          <span className="relative z-10">{texts[deviceConfigs[type].nameKey]}</span>
                        </button>
                      ))}
                    </div>
                    
                    {/* 分辨率显示 */}
                    <span className="text-xs text-gray-400 font-mono">
                      {useCustomSize ? `${wallpaperSize.width} × ${wallpaperSize.height}` : `${deviceConfigs[deviceType].width} × ${deviceConfigs[deviceType].height}`}
                    </span>
                  </div>
                </div>
                
                {/* 预览画布 - 固定高度容器 */}
                <div className="relative w-full h-[500px] flex items-center justify-center">
                  <div
                    ref={canvasRef}
                    className={`relative h-full rounded-3xl overflow-hidden shadow-xl ring-1 ring-black/5 bg-gray-100 transition-all duration-300`}
                    style={{
                      background: getCurrentBackground(),
                      aspectRatio: useCustomSize 
                        ? `${wallpaperSize.width} / ${wallpaperSize.height}`
                        : deviceConfigs[deviceType].aspectRatio.replace('aspect-[', '').replace(']', ''),
                    }}
                  >
                    <div
                      className="absolute transition-all duration-300 ease-out"
                      style={{
                        left: `${logoPosition.x}%`,
                        top: `${logoPosition.y}%`,
                        transform: 'translate(-50%, -50%)',
                        width: `${logoSize}px`,
                        height: `${logoSize}px`,
                        filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.3))',
                      }}
                    >
                      <AppleLogo color={logoColor} />
                    </div>
                  </div>
                </div>
                
                {/* 下载按钮 */}
                <button
                  onClick={handleDownload}
                  className="group w-full mt-6 bg-gray-900 text-white font-medium py-3.5 px-6 rounded-2xl text-sm hover:bg-gray-800 transition-all duration-200 active:scale-[0.99]"
                  aria-label={`${texts.download} ${deviceConfigs[deviceType].nameKey} ${texts.customWallpaper}`}
                >
                  <span className="flex items-center justify-center gap-2.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{texts.download}</span>
                  </span>
                </button>
              </div>
            </section>

            {/* 右侧：控制面板 */}
            <aside className="lg:col-span-5 order-1 lg:order-2" aria-label={localizedA11y.controls}>
              <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-6 lg:p-8 sticky top-24">
                
                {/* 预设壁纸选择 */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">{texts.presetGradients}</h3>
                  <div className="grid grid-cols-4 gap-2.5">
                    {presetWallpapers.map((wallpaper) => (
                      <button
                        key={wallpaper.id}
                        onClick={() => {
                          handlePresetSelect(wallpaper);
                        }}
                        className={`group relative aspect-square rounded-xl transition-all duration-200 ${
                          !useCustomColor && selectedWallpaper.id === wallpaper.id
                            ? 'ring-2 ring-blue-500 ring-offset-2 scale-95'
                            : 'ring-1 ring-gray-200/50 hover:scale-95 hover:ring-gray-300'
                        }`}
                        style={{
                          background: wallpaper.color,
                        }}
                      >
                        {!useCustomColor && selectedWallpaper.id === wallpaper.id && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-8"></div>

                {/* 自定义颜色 */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">{texts.customColor}</h3>
                    <div className="flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => {
                          handleCustomColorChange(e.target.value);
                        }}
                        className="absolute inset-0 w-14 h-14 opacity-0 cursor-pointer"
                        aria-label={texts.backgroundColor}
                      />
                      <div 
                        className={`w-14 h-14 rounded-xl cursor-pointer transition-all ${
                          useCustomColor
                            ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg'
                            : 'ring-1 ring-gray-200/50 hover:ring-gray-300 shadow-sm'
                        }`}
                        style={{ backgroundColor: customColor }}
                        onClick={() => setUseCustomColor(true)}
                      />
                    </div>
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => {
                        handleCustomColorChange(e.target.value);
                      }}
                      onFocus={() => setUseCustomColor(true)}
                      placeholder="#667eea"
                      className="flex-1 bg-gray-50 text-gray-900 px-4 py-3 rounded-xl ring-1 ring-gray-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono text-sm transition-all"
                    />
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-8"></div>

                {/* 壁纸大小控制 */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">{texts.wallpaperSize}</h3>
                  
                  <div className="space-y-6">
                    {/* 大小模式选择 */}
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <button
                          onClick={() => handleCustomSizeToggle(false)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            !useCustomSize
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {texts.originalSize}
                        </button>
                        <button
                          onClick={() => handleCustomSizeToggle(true)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            useCustomSize
                              ? 'bg-blue-500 text-white shadow-sm'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {texts.customSize}
                        </button>
                      </div>
                    </div>

                    {/* 自定义大小控制 */}
                    {useCustomSize && (
                      <div className="space-y-4">
                        {/* 保持宽高比开关 */}
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {texts.maintainAspectRatio}
                          </label>
                          <button
                            onClick={() => handleMaintainAspectRatioChange(!maintainAspectRatio)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              maintainAspectRatio ? 'bg-blue-500' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                maintainAspectRatio ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* 宽度控制 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">{texts.width}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="100"
                                max="8000"
                                value={wallpaperSize.width}
                                onChange={(e) => handleWidthChange(Number(e.target.value))}
                                className="w-20 text-xs font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                              />
                              <span className="text-xs text-gray-500">px</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="100"
                            max="8000"
                            value={wallpaperSize.width}
                            onChange={(e) => handleWidthChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer slider"
                          />
                        </div>

                        {/* 高度控制 */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-500">{texts.height}</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="100"
                                max="8000"
                                value={wallpaperSize.height}
                                onChange={(e) => handleHeightChange(Number(e.target.value))}
                                className="w-20 text-xs font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                              />
                              <span className="text-xs text-gray-500">px</span>
                            </div>
                          </div>
                          <input
                            type="range"
                            min="100"
                            max="8000"
                            value={wallpaperSize.height}
                            onChange={(e) => handleHeightChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer slider"
                          />
                        </div>

                        {/* 重置按钮 */}
                        <button
                          onClick={resetToOriginalSize}
                          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          {texts.resetSize}
                        </button>
                      </div>
                    )}

                    {/* 当前尺寸显示 */}
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500 mb-1">{texts.currentSize}</div>
                      <div className="text-sm font-mono text-gray-900">
                        {wallpaperSize.width} × {wallpaperSize.height}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mb-8"></div>

                {/* Logo 控制 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-6">{texts.appleLogo}</h3>
                  
                  <div className="space-y-6">
                      {/* Logo 颜色 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{texts.color}</label>
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <input
                              type="color"
                              value={logoColor}
                              onChange={(e) => setLogoColor(e.target.value)}
                              className="absolute inset-0 w-12 h-12 opacity-0 cursor-pointer"
                            />
                            <div 
                              className="w-12 h-12 rounded-lg cursor-pointer ring-1 ring-gray-200/50 hover:ring-gray-300 transition-all shadow-sm"
                              style={{ backgroundColor: logoColor }}
                            />
                          </div>
                          <input
                            type="text"
                            value={logoColor}
                            onChange={(e) => setLogoColor(e.target.value)}
                            placeholder="#ffffff"
                            className="flex-1 bg-gray-50 text-gray-900 px-4 py-2.5 rounded-lg ring-1 ring-gray-200/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono text-xs transition-all"
                          />
                        </div>
                      </div>

                      {/* Logo 大小 */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{texts.size}</label>
                          <span className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">{logoSize}px</span>
                        </div>
                        <input
                          type="range"
                          min="40"
                          max="200"
                          value={logoSize}
                          onChange={(e) => setLogoSize(Number(e.target.value))}
                          className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer slider"
                        />
                      </div>

                      {/* Logo 位置 */}
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">{texts.position}</label>
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-500">{texts.horizontal}</span>
                              <span className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{logoPosition.x}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={logoPosition.x}
                              onChange={(e) => setLogoPosition({ ...logoPosition, x: Number(e.target.value) })}
                              className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer slider"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-500">{texts.vertical}</span>
                              <span className="text-xs font-mono text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{logoPosition.y}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={logoPosition.y}
                              onChange={(e) => setLogoPosition({ ...logoPosition, y: Number(e.target.value) })}
                              className="w-full h-1.5 bg-gray-100 rounded-full appearance-none cursor-pointer slider"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            </aside>
          </div>
        </main>


        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            background: #2563eb;
            cursor: pointer;
            border-radius: 50%;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .slider::-webkit-slider-thumb:hover {
            transform: scale(1.15);
            background: #1d4ed8;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
          }
          
          .slider::-moz-range-thumb {
            width: 16px;
            height: 16px;
            background: #2563eb;
            cursor: pointer;
            border-radius: 50%;
            border: none;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .slider::-moz-range-thumb:hover {
            transform: scale(1.15);
            background: #1d4ed8;
            box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
          }

          .active\\:scale-98:active {
            transform: scale(0.98);
          }
        `}</style>
        </div>
      </>
    );
}

// 设计工具页面：在线生成自定义壁纸并导出图片。
export default function DesignPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
        </div>
      </div>
    }>
      <DesignPageContent />
    </Suspense>
  );
}
