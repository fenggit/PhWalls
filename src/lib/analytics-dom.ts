import { trackAnalyticsEvent, type AnalyticsEventParams } from '@/lib/analytics';

export function readAnalyticsParams(element: Element): AnalyticsEventParams {
  try {
    return JSON.parse((element.closest('[data-analytics-params]') as HTMLElement | null)?.dataset.analyticsParams || '{}');
  } catch { return {}; }
}

/** A page-local observer also discovers cards appended by Load more. */
export function observeAnalyticsImpressions(root: Document): () => void {
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const observed = new Set<HTMLElement>();
  const visible = new Set<HTMLElement>();
  const seen = new Set<string>();
  const timers = new Map<HTMLElement, ReturnType<typeof setTimeout>>();
  const cancel = (element: HTMLElement) => {
    clearTimeout(timers.get(element));
    timers.delete(element);
  };
  const schedule = (element: HTMLElement) => {
    if (root.visibilityState !== 'visible' || timers.has(element)) return;
    const event = element.dataset.analyticsImpression;
    const params = readAnalyticsParams(element);
    const key = `${event}:${JSON.stringify(params)}`;
    if (!event || seen.has(key)) return;
    timers.set(element, setTimeout(() => {
      timers.delete(element);
      if (!element.isConnected || !visible.has(element) || root.visibilityState !== 'visible') return;
      seen.add(key);
      trackAnalyticsEvent(event, params);
    }, 1000));
  };
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const element = entry.target as HTMLElement;
      if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
        visible.add(element);
        schedule(element);
      } else { visible.delete(element); cancel(element); }
    });
  }, { threshold: [0, 0.5] });
  const scan = () => {
    observed.forEach(element => {
      if (!element.isConnected) {
        observer.unobserve(element); observed.delete(element); visible.delete(element); cancel(element);
      }
    });
    root.querySelectorAll<HTMLElement>('[data-analytics-impression]').forEach(element => {
      if (!observed.has(element)) { observed.add(element); observer.observe(element); }
    });
  };
  const visibility = () => {
    if (root.visibilityState !== 'visible') timers.forEach((_, element) => cancel(element));
    else visible.forEach(schedule);
  };
  scan();
  const mutations = new MutationObserver(scan);
  mutations.observe(root, { childList: true, subtree: true });
  root.addEventListener('visibilitychange', visibility);
  return () => {
    observer.disconnect(); mutations.disconnect();
    timers.forEach((_, element) => cancel(element));
    root.removeEventListener('visibilitychange', visibility);
  };
}
