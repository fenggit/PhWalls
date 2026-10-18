'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useReportWebVitals } from 'next/web-vitals';
import { getAnalyticsPageContext, trackAnalyticsEvent } from '@/lib/analytics';
import { observeAnalyticsImpressions, readAnalyticsParams } from '@/lib/analytics-dom';

export default function AnalyticsObserver() {
  const pathname = usePathname();
  const lastPage = useRef('');
  const initialPage = useRef(pathname);
  // Web Vitals describe the document navigation, not whichever SPA route is open later.
  useReportWebVitals(useCallback(metric => {
    trackAnalyticsEvent('w_web_vital', {
      ...getAnalyticsPageContext(initialPage.current),
      metric_name: metric.name, metric_value: metric.value,
      metric_rating: metric.rating, metric_id: metric.id,
      navigation_type: metric.navigationType,
    });
  }, []));

  useEffect(() => {
    if (lastPage.current !== pathname) {
      lastPage.current = pathname;
      // Keep Google's automatic page_view untouched; this is the explicit product funnel entry.
      trackAnalyticsEvent('w_page_view');
      const source = new URLSearchParams(window.location.search).get('share_source');
      if (source === 'page' || source === 'wallpaper') trackAnalyticsEvent('w_share_visit', { share_source: source });
    }
    const stopImpressions = observeAnalyticsImpressions(document);
    const click = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
      const element = event.target.closest<HTMLElement>('[data-analytics-event]');
      const card = anchor?.closest<HTMLElement>('[data-analytics-impression]');
      const cardEvents: Record<string, string> = {
        w_collection_impression: 'w_collection_click', w_theme_impression: 'wallpaper_theme_click',
        w_related_impression: 'w_related_click', w_navigation_impression: 'w_navigation_click',
      };
      const inHeader = Boolean(anchor?.closest('header'));
      const eventName = element?.dataset.analyticsEvent || cardEvents[card?.dataset.analyticsImpression || '']
        || (inHeader ? 'w_navigation_click' : undefined);
      if (!eventName) return;
      trackAnalyticsEvent(eventName, {
        ...(inHeader ? { entry_point: 'header' } : {}),
        ...readAnalyticsParams(element || anchor!),
        ...(anchor ? { target: new URL(anchor.href, window.location.origin).pathname } : {}),
      });
    };
    const mediaError = (event: Event) => {
      const image = event.target;
      if (!(image instanceof HTMLImageElement) || !image.closest('main') || image.closest('[role="dialog"]')) return;
      trackAnalyticsEvent('w_media_error', {
        ...readAnalyticsParams(image), media_location: 'card', error_code: 'image_load',
      });
    };
    document.addEventListener('click', click, true);
    document.addEventListener('error', mediaError, true);
    return () => {
      stopImpressions();
      document.removeEventListener('click', click, true);
      document.removeEventListener('error', mediaError, true);
    };
  }, [pathname]);
  return null;
}
