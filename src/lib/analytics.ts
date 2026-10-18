export type AnalyticsEventParams = Record<string, string | number | boolean | undefined>;

type AnalyticsWallpaper = {
  id?: string; name: string; type: string; originPath: string;
  category?: string; brand?: string; sourcePath?: string; collectionId?: string;
  width?: number | null; height?: number | null;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: 'event',
      eventName: string,
      eventParams?: AnalyticsEventParams
    ) => void;
  }
}

export function getAnalyticsPageContext(pathname: string): AnalyticsEventParams {
  const pagePath = pathname.split(/[?#]/)[0];
  const segments = pagePath.split('/').filter(Boolean);
  const siteLanguage = /^(en|zh|ja|vi|zh-hant)$/.test(segments[0] || '') ? segments.shift() : undefined;
  const path = `/${segments.join('/')}`;
  const pageType = path === '/' || /^\/home(?:\/|$)/.test(path) ? 'home'
    : /\/(?:live-)?wallpapers\/[^/]+\/[^/]+/.test(path) ? 'collection'
    : /^\/themes\/[^/]+/.test(path) ? 'theme'
    : path === '/themes' ? 'theme_index'
    : /^\/(manager|admin)(?:\/|$)/.test(path) ? 'admin'
    : /^\/(about|privacy|design)(?:\/|$)/.test(path) ? 'information' : 'category';
  return { page_path: pagePath, site_language: siteLanguage, page_type: pageType };
}

export function normalizeAnalyticsSearch(value: string): string | undefined {
  const term = value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
  // Search terms are user input: do not collect contacts, URLs or long numeric identifiers.
  if (!term || term.length > 80 || /[@:/?=&]|www\.|\b\S+\.(com|net|org|cn)\b/i.test(term)
    || /(?:\d[\s()+.-]*){7,}/.test(term)) return undefined;
  return term;
}

export function getWallpaperAnalyticsParams(item: AnalyticsWallpaper, context: AnalyticsEventParams = {}): AnalyticsEventParams {
  return {
    ...context,
    wallpaper_id: item.id,
    wallpaper_name: item.name,
    collection_id: item.collectionId || context.collection_id,
    brand_slug: item.brand || context.brand_slug,
    media_type: item.type.startsWith('video/') || /\.(mp4|webm)$/i.test(item.originPath) ? 'dynamic' : 'static',
    device_type: item.category || (item.sourcePath ? (item.sourcePath.startsWith('/desktop/') ? 'desktop' : 'phone') : context.device_type),
    width: item.width || undefined,
    height: item.height || undefined,
  };
}

export function buildAnalyticsShareUrl(value: string, source: 'page' | 'wallpaper'): string {
  const url = new URL(value);
  url.searchParams.set('share_source', source);
  url.hash = '';
  return url.toString();
}

/** Serializable attributes keep server-rendered recommendations as server components. */
export function analyticsAttributes(params: AnalyticsEventParams, impression?: string, click?: string) {
  return {
    'data-analytics-params': JSON.stringify(params),
    'data-analytics-impression': impression,
    'data-analytics-event': click,
  };
}

export function trackAnalyticsEvent(
  eventName: string,
  eventParams?: AnalyticsEventParams
): void {
  if (typeof window === 'undefined') return;
  // Telemetry is best effort and must never interrupt navigation, downloads or sharing.
  try {
    const context = getAnalyticsPageContext(window.location.pathname);
    if (context.page_type === 'admin') return;
    let debug = false;
    try { debug = window.sessionStorage.getItem('phwalls_analytics_debug') === '1'; } catch { /* Storage is optional. */ }
    if (!debug && !/^(www\.)?phwalls\.com$/.test(window.location.hostname)) return;
    const params: AnalyticsEventParams = {
      ...context,
      site_language: context.site_language || document.documentElement.lang,
      analytics_version: '2',
      ...eventParams,
      ...(debug ? { debug_mode: true } : {}),
    };
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) delete params[key];
      else if (typeof params[key] === 'string') params[key] = params[key].slice(0, key === 'page_path' ? 500 : 100);
    });
    if (window.gtag) window.gtag('event', eventName, params);
    else {
      // Preserve the standard gtag Arguments queue until the existing initializer runs.
      window.dataLayer = window.dataLayer || [];
      const enqueue = function (command: 'event', name: string, values: AnalyticsEventParams) {
        void command; void name; void values;
        // Match the Arguments queue consumed by gtag.js, including before initialization.
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
      enqueue('event', eventName, params);
    }
  } catch { /* Analytics/storage blockers must not affect the product. */ }
}
