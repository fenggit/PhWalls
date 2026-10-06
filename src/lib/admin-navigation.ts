const ADMIN_TABS = ['brands', 'devices', 'i18n', 'wallpapers', 'upload'] as const;
export type AdminTab = typeof ADMIN_TABS[number];

export function resolveAdminTab(value: unknown): AdminTab {
  return typeof value === 'string' && ADMIN_TABS.includes(value as AdminTab) ? value as AdminTab : 'devices';
}

export function adminTabHref(current: URL, tab: AdminTab): string {
  const target = new URL(current);
  target.searchParams.set('tab', tab);
  return `${target.pathname}${target.search}${target.hash}`;
}
