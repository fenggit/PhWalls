export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

type EventName =
  | 'w_device_info'
  | 'w_open_about'
  | 'w_open_about_us'
  | 'w_open_privacy_policy'
  | 'w_open_contact_us'
  | 'w_nav_category_click'
  | 'w_nav_language_change'
  | 'w_preview_wallpaper'
  | 'w_preview_navigate'
  | 'w_preview_zoom'
  | 'w_preview_refresh'
  | 'w_wallpaper_download_click'
  | 'w_wallpaper_download_confirm_view'
  | 'w_wallpaper_download_confirm_accept'
  | 'w_wallpaper_download_confirm_cancel'
  | 'w_wallpaper_download_success'
  | 'w_wallpaper_download_fail'
  | 'w_mini_program'
  | 'w_design_device_change'
  | 'w_design_preset_select'
  | 'w_design_custom_color_set'
  | 'w_design_custom_size_toggle'
  | 'w_design_size_change'
  | 'w_design_aspect_toggle'
  | 'w_design_download';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const sanitizeParams = (params?: AnalyticsParams) => {
  if (!params) return undefined;
  const sanitized: Record<string, string | number | boolean> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    sanitized[key] = value as string | number | boolean;
  });
  return sanitized;
};

export const trackEvent = (name: EventName, params?: AnalyticsParams) => {
  // try {
  //   if (typeof window === 'undefined') return;
  //   if (typeof window.gtag !== 'function') return;
  //   const sanitized = sanitizeParams(params);
  //   if (sanitized) {
  //     window.gtag('event', name, sanitized);
  //   } else {
  //     window.gtag('event', name);
  //   }
  // } catch (error) {
  //   // Swallow analytics errors to avoid impacting app flow.
  //   if (typeof console !== 'undefined' && typeof console.warn === 'function') {
  //     console.warn('analytics trackEvent failed', { name, error });
  //   }
  // }
};

export const analytics = {
  deviceInfo: (params: {
    system: string;
    language: string;
  }) =>
    trackEvent('w_device_info', {
      system: params.system,
      language: params.language,
    }),
  openAbout: () => trackEvent('w_open_about'),
  openAboutUs: () => trackEvent('w_open_about_us'),
  openPrivacyPolicy: () => trackEvent('w_open_privacy_policy'),
  openContactUs: () => trackEvent('w_open_contact_us'),
  navCategoryClick: (params: {
    categoryTitle?: string;
  }) =>
    trackEvent('w_nav_category_click', {
      title: params.categoryTitle,
    }),
  navLanguageChange: (params: {
    language: string;
  }) =>
    trackEvent('w_nav_language_change', {
      language: params.language,
    }),
  previewWallpaper: (params: { action: 'open' | 'close'; wallpaperName?: string }) =>
    trackEvent('w_preview_wallpaper', {
      action: params.action,
      wallpaper_name: params.wallpaperName,
    }),
  previewNavigate: (params: { wallpaperName?: string }) =>
    trackEvent('w_preview_navigate', {
      wallpaper_name: params.wallpaperName,
    }),
  previewZoom: (params: { zoomLevel: number; wallpaperName?: string }) =>
    trackEvent('w_preview_zoom', {
      zoom_level: params.zoomLevel,
      wallpaper_name: params.wallpaperName,
    }),
  previewRefresh: (params: { wallpaperName?: string }) =>
    trackEvent('w_preview_refresh', {
      wallpaper_name: params.wallpaperName,
    }),
  downloadClick: (params: {
    wallpaperName?: string;
  }) =>
    trackEvent('w_wallpaper_download_click', {
      wallpaper_name: params.wallpaperName,
    }),
  downloadConfirmView: (params: { categoryName: string; wallpaperName?: string }) =>
    trackEvent('w_wallpaper_download_confirm_view', {
      category_name: params.categoryName,
      wallpaper_name: params.wallpaperName,
    }),
  downloadConfirmAccept: (params: { categoryName: string; wallpaperName?: string }) =>
    trackEvent('w_wallpaper_download_confirm_accept', {
      category_name: params.categoryName,
      wallpaper_name: params.wallpaperName,
    }),
  downloadConfirmCancel: (params: { categoryName: string; wallpaperName?: string }) =>
    trackEvent('w_wallpaper_download_confirm_cancel', {
      category_name: params.categoryName,
      wallpaper_name: params.wallpaperName,
    }),
  downloadSuccess: (params: {
    categoryName: string;
    wallpaperName?: string;
  }) =>
    trackEvent('w_wallpaper_download_success', {
      category_name: params.categoryName,
      wallpaper_name: params.wallpaperName,
    }),
  downloadFail: (params: {
    categoryName: string;
    wallpaperName?: string;
  }) =>
    trackEvent('w_wallpaper_download_fail', {
      category_name: params.categoryName,
      wallpaper_name: params.wallpaperName,
    }),
  miniProgram: (params: { action: 'open' | 'close' }) =>
    trackEvent('w_mini_program', {
      action: params.action,
    }),
  designDeviceChange: (params: { deviceType: string }) =>
    trackEvent('w_design_device_change', {
      device_type: params.deviceType,
    }),
  designPresetSelect: (params: { presetId: number; presetName: string }) =>
    trackEvent('w_design_preset_select', {
      preset_id: params.presetId,
      preset_name: params.presetName,
    }),
  designCustomColorSet: (params: { colorHex: string }) =>
    trackEvent('w_design_custom_color_set', {
      color_hex: params.colorHex,
    }),
  designCustomSizeToggle: (params: { enabled: boolean }) =>
    trackEvent('w_design_custom_size_toggle', {
      enabled: params.enabled,
    }),
  designSizeChange: (params: {
    width: number;
    height: number;
    maintainAspect: boolean;
  }) =>
    trackEvent('w_design_size_change', {
      width: params.width,
      height: params.height,
      maintain_aspect: params.maintainAspect,
    }),
  designAspectToggle: (params: { enabled: boolean }) =>
    trackEvent('w_design_aspect_toggle', {
      enabled: params.enabled,
    }),
  designDownload: (params: {
    deviceType: string;
    width: number;
    height: number;
    useCustomSize: boolean;
    useCustomColor: boolean;
    presetId: number;
    presetName: string;
  }) =>
    trackEvent('w_design_download', {
      device_type: params.deviceType,
      width: params.width,
      height: params.height,
      use_custom_size: params.useCustomSize,
      use_custom_color: params.useCustomColor,
      preset_id: params.presetId,
      preset_name: params.presetName,
    }),
};
