export type AnalyticsEventParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    gtag?: (
      command: 'event',
      eventName: string,
      eventParams?: AnalyticsEventParams
    ) => void;
  }
}

export function trackAnalyticsEvent(
  eventName: string,
  eventParams?: AnalyticsEventParams
): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.gtag?.('event', eventName, eventParams);
}
