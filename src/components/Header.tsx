'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  ChevronDown,
  ExternalLink,
  Globe,
  Info,
  Menu,
  Monitor,
  Share2,
  Smartphone,
  X,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useShare } from '@/components/ShareProvider';
import { getTabData } from '@/lib/data';
import { getDesktopTabData } from '@/lib/desktop-data';
import { filterHomeTabs } from '@/lib/home-priority';
import { getI18nTexts, I18nTexts } from '@/lib/i18n';
import { buildBrandPath, normalizeCategoryType } from '@/lib/brands';
import { stripLanguagePrefix, withLanguagePath } from '@/lib/language';
import { getShareTexts } from '@/lib/share';
import { Language, LanguageCode, TabInfo } from '@/types';

export interface HeaderProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  activeCategoryTypeOverride?: string;
}

type PrimaryMenu = 'phone' | 'desktop';

type PrimaryNavigationItem = {
  id: 'phone' | 'apple' | 'desktop';
  label: string;
  href: string;
  external?: boolean;
  menu?: PrimaryMenu;
};

const languageConfig: Record<Language, { name: string; key: keyof I18nTexts }> = {
  [LanguageCode.EN]: { name: 'english', key: 'english' },
  [LanguageCode.ZH]: { name: 'chineseSimplified', key: 'chineseSimplified' },
  [LanguageCode.JA]: { name: 'japanese', key: 'japanese' },
  [LanguageCode.VI]: { name: 'vietnamese', key: 'vietnamese' },
  [LanguageCode.ZH_HANT]: { name: 'chineseTraditional', key: 'chineseTraditional' },
};

const languageOrder: Language[] = [
  LanguageCode.EN,
  LanguageCode.ZH,
  LanguageCode.JA,
  LanguageCode.VI,
  LanguageCode.ZH_HANT,
];

const SHOW_MINI_PROGRAM = false;
const PHONE_NAVIGATION_ORDER = [
  'samsung',
  'xiaomi',
  'huawei',
  'oppo',
  'vivo',
  'google-pixel',
  'honor',
  'oneplus',
  'motorola',
  'sony',
  'nothing',
  'realme',
  'redmi',
  'poco',
  'iqoo',
  'asus-rog-phone',
  'transsion-infinix',
  'transsion-tecno',
  'nokia',
  'android',
] as const;
const POPULAR_PHONE_TYPES: ReadonlySet<string> = new Set(PHONE_NAVIGATION_ORDER.slice(0, 8));

const BRAND_ICON_PATHS: Record<string, string> = {
  apple: '/brand-icons/apple.svg',
  iphone: '/brand-icons/apple.svg',
  macos: '/brand-icons/apple.svg',
  poco: '/brand-icons/poco.svg',
  'transsion-tecno': '/brand-icons/transsion-tecno.svg',
  harmonyos: '/brand-icons/harmonyos.svg',
  'huawei-matepad': '/brand-icons/huawei.svg',
  samsung: '/brand-icons/samsung.svg',
  smartisan: '/brand-icons/smartisan.svg',
  xiaomi: '/brand-icons/xiaomi.svg',
  huawei: '/brand-icons/huawei.svg',
  oppo: '/brand-icons/oppo.svg',
  vivo: '/brand-icons/vivo.svg',
  'google-pixel': '/brand-icons/google-pixel.svg',
  honor: '/brand-icons/honor.svg',
  oneplus: '/brand-icons/oneplus.svg',
  motorola: '/brand-icons/motorola.svg',
  sony: '/brand-icons/sony.svg',
  nothing: '/brand-icons/nothing.svg',
  realme: '/brand-icons/realme.svg',
  redmi: '/brand-icons/xiaomi.svg',
  iqoo: '/brand-icons/iqoo.svg',
  'asus-rog-phone': '/brand-icons/asus-rog-phone.svg',
  'transsion-infinix': '/brand-icons/transsion-infinix.svg',
  nokia: '/brand-icons/nokia.svg',
  android: '/brand-icons/android.svg',
  'microsoft-windows': '/brand-icons/microsoft.svg',
  'microsoft-surface': '/brand-icons/microsoft.svg',
  ubuntu: '/brand-icons/ubuntu.svg',
  'omarchy-linux': '/brand-icons/omarchy-linux.svg',
  'google-chromeos': '/brand-icons/google-chromeos.svg',
  'google-os': '/brand-icons/google-os.svg',
};

const WORDMARK_TYPES = new Set([
  'samsung', 'sony', 'oppo', 'vivo', 'honor', 'nokia', 'iqoo',
  'transsion-infinix', 'transsion-tecno', 'poco', 'nothing', 'realme',
]);

function BrandIcon({ type, desktop = false }: { type: string; desktop?: boolean }) {
  const normalizedType = normalizeCategoryType(type);
  const iconPath = BRAND_ICON_PATHS[normalizedType];
  const isWordmark = WORDMARK_TYPES.has(normalizedType);

  return (
    <span className={`flex shrink-0 items-center justify-center ${desktop ? 'h-7 w-9' : 'h-8 w-12'}`}>
      {iconPath ? (
        <img
          src={`${iconPath}?v=20260921-1`}
          alt=""
          className={`object-contain ${desktop ? (isWordmark ? 'max-h-4 w-8' : 'h-5 w-5') : (isWordmark ? 'max-h-5 w-10' : 'h-5 w-5')}`}
          aria-hidden="true"
        />
      ) : (
        <Smartphone className="h-4 w-4 text-gray-400" aria-hidden="true" />
      )}
    </span>
  );
}

export default function Header({
  currentLang,
  onLanguageChange,
  activeCategoryTypeOverride,
}: HeaderProps) {
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isMiniProgramMenuOpen, setIsMiniProgramMenuOpen] = useState(false);
  const [openPrimaryMenu, setOpenPrimaryMenu] = useState<PrimaryMenu | null>(null);
  const [mobileNavigationSection, setMobileNavigationSection] = useState<PrimaryMenu>('phone');
  const miniProgramMenuRef = useRef<HTMLDivElement>(null);
  const mobileMiniProgramPanelRef = useRef<HTMLDivElement>(null);
  const primaryNavigationRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);
  const languageButtonRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const primaryTriggerRefs = useRef<Record<PrimaryMenu, HTMLButtonElement | null>>({
    phone: null,
    desktop: null,
  });
  const primaryMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusPrimaryPanelRef = useRef(false);
  const shareInProgressRef = useRef(false);

  const clearPrimaryMenuTimer = useCallback(() => {
    if (primaryMenuTimerRef.current) clearTimeout(primaryMenuTimerRef.current);
    primaryMenuTimerRef.current = null;
  }, []);

  const openMenu = useCallback((menu: PrimaryMenu, focusPanel = false) => {
    clearPrimaryMenuTimer();
    focusPrimaryPanelRef.current = focusPanel;
    setIsLanguageMenuOpen(false);
    setIsMiniProgramMenuOpen(false);
    setOpenPrimaryMenu(menu);
    if (focusPanel) {
      window.requestAnimationFrame(() => {
        primaryNavigationRef.current
          ?.querySelector<HTMLElement>(`[data-primary-menu-panel="${menu}"] a[href]`)
          ?.focus();
      });
    }
  }, [clearPrimaryMenuTimer]);

  useEffect(() => clearPrimaryMenuTimer, [clearPrimaryMenuTimer]);
  const pathname = usePathname();
  const { sharePayload, setSharePayload } = useShare();
  const texts = getI18nTexts(currentLang);
  const shareTexts = getShareTexts(currentLang);

  const phoneTabs = useMemo(() => {
    const navigationRank = new Map<string, number>(
      PHONE_NAVIGATION_ORDER.map((type, index) => [type, index])
    );
    return filterHomeTabs(getTabData(currentLang))
      .filter((tab) => !tab.link?.trim() && normalizeCategoryType(tab.type) !== 'desktop')
      .sort((left, right) => {
        const leftRank = navigationRank.get(normalizeCategoryType(left.type)) ?? Number.MAX_SAFE_INTEGER;
        const rightRank = navigationRank.get(normalizeCategoryType(right.type)) ?? Number.MAX_SAFE_INTEGER;
        return leftRank - rightRank;
      });
  }, [currentLang]);
  const popularPhoneTabs = useMemo(
    () => phoneTabs.filter((tab) => POPULAR_PHONE_TYPES.has(normalizeCategoryType(tab.type))),
    [phoneTabs]
  );
  const morePhoneTabs = useMemo(
    () => phoneTabs.filter((tab) => !POPULAR_PHONE_TYPES.has(normalizeCategoryType(tab.type))),
    [phoneTabs]
  );
  const appleTab = useMemo(
    () => getTabData(currentLang).find((tab) => normalizeCategoryType(tab.type) === 'iphone' && tab.link?.trim()),
    [currentLang]
  );
  const desktopTabs = useMemo(
    () => getDesktopTabData().filter((tab) => !tab.link?.trim()),
    []
  );

  const getActiveTypeFromPath = useCallback((currentPath: string): string => {
    const normalizedPath = stripLanguagePrefix(currentPath).path;
    if (normalizedPath === '/') return 'all';
    if (normalizedPath === '/desktop') return 'desktop';
    const desktopCategoryMatch = normalizedPath.match(/^\/desktop\/(?:wallpapers\/)?([^/]+)(?:\/|$)/);
    if (desktopCategoryMatch?.[1]) {
      try {
        return normalizeCategoryType(decodeURIComponent(desktopCategoryMatch[1]));
      } catch {
        return normalizeCategoryType(desktopCategoryMatch[1]);
      }
    }
    const topLevelMatch = normalizedPath.match(/^\/([^/]+)$/);
    if (topLevelMatch?.[1]) {
      try {
        return normalizeCategoryType(decodeURIComponent(topLevelMatch[1]));
      } catch {
        return normalizeCategoryType(topLevelMatch[1]);
      }
    }
    return '';
  }, []);

  const resolveActiveType = useCallback(
    (currentPath: string) =>
      activeCategoryTypeOverride
        ? normalizeCategoryType(activeCategoryTypeOverride)
        : getActiveTypeFromPath(currentPath),
    [activeCategoryTypeOverride, getActiveTypeFromPath]
  );

  const [activeCategoryType, setActiveCategoryType] = useState(() => resolveActiveType(pathname));
  const pathWithoutLanguage = stripLanguagePrefix(pathname).path;
  const activeSection: PrimaryMenu = pathWithoutLanguage.startsWith('/desktop') ? 'desktop' : 'phone';
  const appleHref = appleTab?.link?.trim() || 'https://applewalls.com';
  const mobilePopularPhoneTabs = useMemo<TabInfo[]>(
    () => [
      {
        title: texts.appleNavShortLabel,
        type: 'apple',
        link: appleHref,
        icon: '',
        items: [],
      },
      ...popularPhoneTabs,
    ],
    [appleHref, popularPhoneTabs, texts.appleNavShortLabel]
  );

  const primaryNavigation = useMemo<PrimaryNavigationItem[]>(
    () => [
      {
        id: 'phone',
        label: texts.phoneWallpapersNavLabel,
        href: withLanguagePath('/', currentLang),
        menu: 'phone',
      },
      {
        id: 'apple',
        label: texts.appleWallpapersNavLabel,
        href: appleHref,
        external: true,
      },
      {
        id: 'desktop',
        label: texts.desktopWallpapersNavLabel,
        href: withLanguagePath('/desktop', currentLang),
        menu: 'desktop',
      },
    ],
    [
      appleHref,
      currentLang,
      texts.appleWallpapersNavLabel,
      texts.desktopWallpapersNavLabel,
      texts.phoneWallpapersNavLabel,
    ]
  );

  useEffect(() => {
    clearPrimaryMenuTimer();
    setIsLanguageMenuOpen(false);
    setActiveCategoryType(resolveActiveType(pathname));
    setOpenPrimaryMenu(null);
    setIsDeviceMenuOpen(false);
  }, [pathname, resolveActiveType, clearPrimaryMenuTimer]);

  useEffect(() => {
    if (!openPrimaryMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!primaryNavigationRef.current?.contains(event.target as Node)) {
        setOpenPrimaryMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPrimaryMenu]);

  useEffect(() => {
    if (!openPrimaryMenu) return;

    const frame = window.requestAnimationFrame(() => {
      if (!focusPrimaryPanelRef.current) return;
      focusPrimaryPanelRef.current = false;
      const panel = primaryNavigationRef.current?.querySelector<HTMLElement>(
        `[data-primary-menu-panel="${openPrimaryMenu}"]`
      );
      panel?.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus();
    });

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      clearPrimaryMenuTimer();
      const trigger = primaryTriggerRefs.current[openPrimaryMenu];
      setOpenPrimaryMenu(null);
      window.requestAnimationFrame(() => trigger?.focus());
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openPrimaryMenu, clearPrimaryMenuTimer]);

  useEffect(() => {
    if (!isLanguageMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        window.matchMedia('(min-width: 768px)').matches &&
        !languageMenuRef.current?.contains(event.target as Node)
      ) {
        setIsLanguageMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsLanguageMenuOpen(false);
      window.requestAnimationFrame(() => languageButtonRef.current?.focus());
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isLanguageMenuOpen]);

  useEffect(() => {
    if (!isDeviceMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const drawer = mobileDrawerRef.current;
    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const frame = window.requestAnimationFrame(() => {
      drawer?.querySelector<HTMLElement>(focusableSelector)?.focus();
    });

    const handleDrawerKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsDeviceMenuOpen(false);
        window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
        return;
      }

      if (event.key !== 'Tab' || !drawer) return;
      const focusableElements = Array.from(
        drawer.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((element) => !element.hasAttribute('hidden'));
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleDrawerKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleDrawerKeyDown);
    };
  }, [isDeviceMenuOpen]);

  const closeMenus = useCallback(() => {
    clearPrimaryMenuTimer();
    setIsDeviceMenuOpen(false);
    setIsLanguageMenuOpen(false);
    setIsMiniProgramMenuOpen(false);
    setOpenPrimaryMenu(null);
  }, [clearPrimaryMenuTimer]);

  const closeMobileMenu = useCallback(() => {
    setIsDeviceMenuOpen(false);
    window.requestAnimationFrame(() => mobileMenuButtonRef.current?.focus());
  }, []);

  const handleMobileMenuToggle = () => {
    if (isDeviceMenuOpen) {
      closeMobileMenu();
      return;
    }

    setMobileNavigationSection(activeSection);
    setIsLanguageMenuOpen(false);
    setIsMiniProgramMenuOpen(false);
    setOpenPrimaryMenu(null);
    setIsDeviceMenuOpen(true);
  };

  const handleLanguageChange = (lang: Language) => {
    onLanguageChange(lang);
    setIsLanguageMenuOpen(false);
  };

  const handleShareClick = useCallback(() => {
    closeMenus();
    if (typeof window === 'undefined') return;

    const payload = sharePayload ?? {
      title: document.title.replace(/\s+\|\s+PhWalls$/, '').trim() || texts.siteName,
      url: window.location.href,
      brand: texts.siteName,
      images: [],
    };
    setSharePayload(payload);

    if (typeof navigator.share === 'function') {
      if (shareInProgressRef.current) return;
      shareInProgressRef.current = true;
      void navigator
        .share({ title: payload.title, text: payload.brand || texts.siteName, url: payload.url })
        .catch((error: unknown) => {
          if (
            error instanceof DOMException &&
            (error.name === 'AbortError' || error.name === 'InvalidStateError')
          ) {
            return;
          }
          console.error('System share failed:', error);
        })
        .finally(() => {
          shareInProgressRef.current = false;
        });
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(payload.url).catch((error: unknown) => {
        console.error('Copy share link failed:', error);
      });
      return;
    }
    window.prompt(shareTexts.share, payload.url);
  }, [closeMenus, setSharePayload, sharePayload, shareTexts.share, texts.siteName]);

  const handleMiniProgramClick = () => {
    if (!SHOW_MINI_PROGRAM) return;
    setIsMiniProgramMenuOpen((prev) => !prev);
    setIsLanguageMenuOpen(false);
    setIsDeviceMenuOpen(false);
    setOpenPrimaryMenu(null);
  };

  useEffect(() => {
    if (!isMiniProgramMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !miniProgramMenuRef.current?.contains(target) &&
        !mobileMiniProgramPanelRef.current?.contains(target)
      ) {
        setIsMiniProgramMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMiniProgramMenuOpen]);

  useEffect(() => {
    if (!SHOW_MINI_PROGRAM || typeof window === 'undefined') return;
    if (stripLanguagePrefix(window.location.pathname).path === '/') {
      setIsMiniProgramMenuOpen(true);
    }
  }, []);

  const utilityButtonClass = (isActive = false) =>
    `inline-flex h-9 w-9 items-center justify-center rounded-md text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:translate-y-px ${
      isActive
        ? 'bg-gray-100 text-blue-700'
        : 'text-gray-700 hover:bg-gray-200 hover:text-gray-950'
    }`;

  const primaryItemClass = (isActive: boolean) =>
    `inline-flex h-10 items-center whitespace-nowrap rounded-full px-4 text-[15px] font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
      isActive ? 'bg-gray-100 text-gray-950' : 'text-gray-700 hover:bg-gray-200 hover:text-gray-950'
    }`;

  const submenuItemClass = (isActive: boolean) =>
    `group flex min-h-9 min-w-0 items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:translate-y-px ${
      isActive
        ? 'bg-blue-50/80 font-semibold text-blue-700'
        : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-950'
    }`;

  const renderCategoryLink = (tab: TabInfo, section: PrimaryMenu, mobile = false) => {
    const normalizedType = normalizeCategoryType(tab.type);
    const isActive = normalizedType === activeCategoryType;
    const isExternal = Boolean(tab.link?.trim());
    const href = isExternal
      ? tab.link!.trim()
      : withLanguagePath(
          section === 'desktop' ? `/desktop/${normalizedType}` : buildBrandPath(tab.type),
          currentLang
        );
    const className = mobile
      ? `${submenuItemClass(isActive)} border border-transparent ${isActive ? 'border-blue-100' : ''}`
      : `group flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-[14px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
          isActive ? 'border-blue-200 bg-blue-50 font-semibold text-blue-900' : 'text-gray-900 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900 focus-visible:bg-blue-50'
        }`;

    return isExternal ? (
      <a
        key={`${section}-${tab.type}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={closeMenus}
      >
        <BrandIcon type={tab.type} desktop={!mobile} />
        <span className="min-w-0 flex-1 truncate">{tab.title}</span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden="true" />
      </a>
    ) : (
      <Link
        key={`${section}-${tab.type}`}
        href={href}
        className={className}
        onClick={closeMenus}
        aria-current={isActive ? 'page' : undefined}
        prefetch
      >
        <BrandIcon type={tab.type} desktop={!mobile} />
        <span className={mobile ? 'min-w-0 truncate' : 'min-w-0 flex-1 whitespace-normal leading-5'}>{tab.title}</span>
      </Link>
    );
  };

  return (
    <>
      <nav
        aria-label={texts.mainNavigationLabel}
        className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-12 items-center md:h-16">
            <Link
              href={withLanguagePath('/', currentLang)}
              className="inline-flex shrink-0 items-center gap-2 text-lg font-semibold text-gray-950 transition-colors duration-200 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 md:text-[22px]"
            >
              <span className="relative h-6 w-6 overflow-hidden rounded-md bg-white md:h-7 md:w-7">
                <img
                  src="/brand/option-03/logo.png"
                  alt={`${texts.siteName} logo`}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </span>
              {texts.siteName}
            </Link>

            <div
              ref={primaryNavigationRef}
              className="relative hidden h-full flex-1 items-center justify-center gap-1 px-6 lg:flex"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  clearPrimaryMenuTimer();
                  setOpenPrimaryMenu(null);
                }
              }}
            >
              {primaryNavigation.map((item) => {
                const isActive = item.menu === activeSection;

                if (item.external) {
                  return (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={closeMenus}
                      onPointerEnter={() => {
                        clearPrimaryMenuTimer();
                        setOpenPrimaryMenu(null);
                      }}
                      className={primaryItemClass(false)}
                    >
                      <span>{item.label}</span>
                      <ExternalLink className="ml-1 h-3 w-3 text-gray-400" aria-hidden="true" />
                    </a>
                  );
                }

                const menuTabs = item.menu === 'desktop' ? desktopTabs : phoneTabs;
                const isOpen = openPrimaryMenu === item.menu;
                return (
                  <div
                    key={item.id}
                    className="flex h-full items-center"
                    onPointerEnter={(event) => {
                      if (event.pointerType !== 'mouse' || !item.menu) return;
                      clearPrimaryMenuTimer();
                      const menu = item.menu;
                      primaryMenuTimerRef.current = setTimeout(() => openMenu(menu), 140);
                    }}
                    onPointerLeave={(event) => {
                      if (event.pointerType !== 'mouse') return;
                      clearPrimaryMenuTimer();
                      primaryMenuTimerRef.current = setTimeout(() => {
                        // Keep a keyboard user's focused panel available.
                        if (!primaryNavigationRef.current?.contains(document.activeElement) ||
                            document.activeElement?.tagName === 'BUTTON') {
                          setOpenPrimaryMenu(null);
                        }
                      }, 240);
                    }}
                  >
                    <button
                      ref={(element) => {
                        if (item.menu) primaryTriggerRefs.current[item.menu] = element;
                      }}
                      type="button"
                      onClick={() => {
                        clearPrimaryMenuTimer();
                        if (isOpen) setOpenPrimaryMenu(null);
                        else if (item.menu) openMenu(item.menu);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'ArrowDown' && item.menu) {
                          event.preventDefault();
                          openMenu(item.menu, true);
                        }
                      }}
                      className={`${primaryItemClass(isActive || isOpen)} gap-2`}
                      id={`primary-trigger-${item.menu}`}
                      aria-label={item.label}
                      aria-expanded={isOpen}
                      aria-controls={`primary-menu-${item.menu}`}
                      aria-haspopup="true"
                    >
                      <span>{item.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden="true"
                      />
                    </button>

                    {isOpen && (
                      <div
                        id={`primary-menu-${item.menu}`}
                        data-primary-menu-panel={item.menu}
                        aria-labelledby={`primary-trigger-${item.menu}`}
                        onKeyDown={(event) => {
                          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
                          const links = Array.from(event.currentTarget.querySelectorAll<HTMLAnchorElement>('a[href]'));
                          const index = links.indexOf(document.activeElement as HTMLAnchorElement);
                          if (index < 0 || links.length === 0) return;
                          event.preventDefault();
                          const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1
                            : (index + (event.key === 'ArrowDown' ? 1 : -1) + links.length) % links.length;
                          links[next].focus();
                        }}
                        className={`absolute left-1/2 top-full max-w-[calc(100vw-3rem)] -translate-x-1/2 pt-2 ${
                          item.menu === 'phone' ? 'w-[44rem]' : 'w-[32rem]'
                        }`}
                      >
                        <div className="nav-menu-enter max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-2xl border border-gray-200/70 bg-white p-5 shadow-[0_16px_48px_-12px_rgba(15,23,42,0.18)]">
                          <div className="mb-4 flex items-center justify-between px-2">
                            <span className="text-base font-semibold tracking-tight text-gray-950">{item.label}</span>
                            {item.menu === 'phone'
                              ? <Smartphone className="h-5 w-5 text-gray-500" aria-hidden="true" />
                              : <Monitor className="h-5 w-5 text-gray-500" aria-hidden="true" />}
                          </div>
                          {item.menu === 'phone' ? (
                            <div>
                              <section aria-labelledby="desktop-popular-brands">
                                <h3 id="desktop-popular-brands" className="mb-2 px-2 text-[13px] font-semibold text-gray-600">
                                  {texts.popularBrandsNavLabel}
                                </h3>
                                <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                                  {popularPhoneTabs.map((tab) => renderCategoryLink(tab, 'phone'))}
                                </div>
                              </section>
                              <section className="mt-4 border-t border-gray-100 pt-4" aria-labelledby="desktop-more-brands">
                                <h3 id="desktop-more-brands" className="mb-2 px-2 text-[13px] font-semibold text-gray-600">
                                  {texts.moreBrandsNavLabel}
                                </h3>
                                <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                                  {morePhoneTabs.map((tab) => renderCategoryLink(tab, 'phone'))}
                                </div>
                              </section>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              {menuTabs.map((tab) => renderCategoryLink(tab, 'desktop'))}
                            </div>
                          )}
                          <Link
                            href={item.href}
                            onClick={closeMenus}
                            className="mt-5 flex items-center justify-between rounded-lg border-t border-gray-100 px-2 pt-4 text-xs font-medium text-gray-500 transition-colors hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            {item.label}
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1 lg:border-l lg:border-gray-200/70 lg:pl-5">
              <div>
                <button
                  type="button"
                  onClick={handleShareClick}
                  className={utilityButtonClass()}
                  aria-label={shareTexts.share}
                  title={shareTexts.share}
                >
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              {SHOW_MINI_PROGRAM && (
                <div
                  className="relative hidden md:block"
                  ref={miniProgramMenuRef}
                  onMouseEnter={() => setIsMiniProgramMenuOpen(true)}
                  onMouseLeave={() => setIsMiniProgramMenuOpen(false)}
                >
                  <button
                    onClick={handleMiniProgramClick}
                    aria-expanded={isMiniProgramMenuOpen}
                    className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 transition-colors duration-200 hover:bg-gray-100 hover:text-blue-700"
                  >
                    {texts.miniProgram}
                  </button>
                  {isMiniProgramMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-gray-200 bg-white p-3 shadow-xl">
                      <button
                        type="button"
                        onClick={() => setIsMiniProgramMenuOpen(false)}
                        className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center text-gray-500 hover:text-gray-900"
                        aria-label="Close mini program panel"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <p className="mb-3 px-6 text-center text-sm text-gray-600">{texts.scanWechatQR}</p>
                      <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-50">
                        <img
                          src="/mini_program.jpg"
                          alt={texts.miniProgram}
                          className="h-full w-full object-contain p-2"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="hidden lg:block">
                <Link
                  href={withLanguagePath('/about', currentLang)}
                  className={utilityButtonClass()}
                  aria-label={texts.about}
                  title={texts.about}
                >
                  <Info className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>

              <div ref={languageMenuRef} className="relative shrink-0"
                onBlur={(event) => {
                  if (window.matchMedia('(min-width: 768px)').matches &&
                      !event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setIsLanguageMenuOpen(false);
                  }
                }}
              >
                <button
                  ref={languageButtonRef}
                  onClick={() => {
                    clearPrimaryMenuTimer();
                    setIsLanguageMenuOpen((prev) => !prev);
                    setIsDeviceMenuOpen(false);
                    setIsMiniProgramMenuOpen(false);
                    setOpenPrimaryMenu(null);
                  }}
                  className={utilityButtonClass(isLanguageMenuOpen)}
                  aria-label="Change language"
                  aria-expanded={isLanguageMenuOpen}
                >
                  <Globe className="h-4 w-4" aria-hidden="true" />
                </button>

                <div
                  className={`nav-menu-enter absolute right-0 z-50 mt-2 hidden min-w-[10rem] overflow-hidden rounded-lg border border-gray-200/90 bg-white shadow-[0_16px_40px_rgba(30,64,175,0.1)] transition-all duration-150 md:block ${
                    isLanguageMenuOpen
                      ? 'visible opacity-100'
                      : 'invisible opacity-0'
                  }`}
                >
                  <div className="py-1.5">
                    {languageOrder.map((lang) => {
                      const config = languageConfig[lang];
                      return (
                        <button
                          key={lang}
                          onClick={() => handleLanguageChange(lang)}
                          className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors ${
                            currentLang === lang
                              ? 'bg-blue-50 font-medium text-blue-700'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
                          }`}
                        >
                          <span>{texts[config.name as keyof typeof texts]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <button
                ref={mobileMenuButtonRef}
                type="button"
                onClick={handleMobileMenuToggle}
                className={`${utilityButtonClass(isDeviceMenuOpen)} lg:hidden`}
                aria-label="Toggle menu"
                aria-expanded={isDeviceMenuOpen}
              >
                {isDeviceMenuOpen ? (
                  <X className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Menu className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

      </nav>

      {isDeviceMenuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            onClick={closeMobileMenu}
            className="absolute inset-0 bg-gray-950/25 backdrop-blur-[2px]"
            aria-label="Close menu"
          />
          <div
            ref={mobileDrawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-navigation-title"
            className="mobile-drawer-enter absolute inset-y-0 right-0 flex h-[100dvh] w-[min(92vw,24rem)] max-w-none flex-col border-l border-gray-200/90 bg-white shadow-[-18px_0_50px_rgba(30,64,175,0.14)]"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 px-4">
              <h2 id="mobile-navigation-title" className="text-base font-semibold text-gray-950">
                {texts.mainNavigationLabel}
              </h2>
              <button
                type="button"
                onClick={closeMobileMenu}
                className={utilityButtonClass()}
                aria-label="Close menu"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="shrink-0 px-4 pt-4">
              <div className="grid grid-cols-2 rounded-lg bg-gray-100 p-1" role="tablist" aria-label={texts.mainNavigationLabel}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileNavigationSection === 'phone'}
                  aria-controls="mobile-phone-panel"
                  onClick={() => setMobileNavigationSection('phone')}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    mobileNavigationSection === 'phone'
                      ? 'bg-white text-gray-950 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Smartphone className="h-4 w-4" aria-hidden="true" />
                  {texts.phoneNavShortLabel}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mobileNavigationSection === 'desktop'}
                  aria-controls="mobile-desktop-panel"
                  onClick={() => setMobileNavigationSection('desktop')}
                  className={`flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    mobileNavigationSection === 'desktop'
                      ? 'bg-white text-gray-950 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  <Monitor className="h-4 w-4" aria-hidden="true" />
                  {texts.desktopNavShortLabel}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4">
              {mobileNavigationSection === 'phone' ? (
                <section id="mobile-phone-panel" role="tabpanel" aria-label={texts.phoneNavShortLabel}>
                  <h3 className="mb-1 px-2 text-xs font-semibold text-gray-500">
                    {texts.popularBrandsNavLabel}
                  </h3>
                  <div className="grid grid-cols-2 gap-1">
                    {mobilePopularPhoneTabs.map((tab) => renderCategoryLink(tab, 'phone', true))}
                  </div>
                  <h3 className="mb-1 mt-3 border-t border-gray-100 px-2 pt-3 text-xs font-semibold text-gray-500">
                    {texts.moreBrandsNavLabel}
                  </h3>
                  <div className="grid grid-cols-2 gap-1">
                    {morePhoneTabs.map((tab) => renderCategoryLink(tab, 'phone', true))}
                  </div>
                </section>
              ) : (
                <section id="mobile-desktop-panel" role="tabpanel" aria-label={texts.desktopNavShortLabel}>
                  <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                    {desktopTabs.map((tab) => renderCategoryLink(tab, 'desktop', true))}
                  </div>
                </section>
              )}
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-gray-100 p-4">
              <button
                type="button"
                data-mobile-drawer-action="share"
                onClick={handleShareClick}
                className="flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                {shareTexts.share}
              </button>
              <Link
                href={withLanguagePath('/about', currentLang)}
                onClick={closeMenus}
                className="flex min-h-11 items-center justify-center gap-2 rounded-md text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
                {texts.about}
              </Link>
            </div>
          </div>
        </div>
      )}

      {isLanguageMenuOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button
            type="button"
            onClick={closeMenus}
            className="absolute inset-0"
            aria-label="Close language menu"
          />
          <div className="absolute right-4 top-14 min-w-[9rem] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="py-1.5">
              {languageOrder.map((lang) => {
                const config = languageConfig[lang];
                return (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors ${
                      currentLang === lang
                        ? 'bg-blue-50 font-medium text-blue-700'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
                    }`}
                  >
                    <span>{texts[config.name as keyof typeof texts]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {SHOW_MINI_PROGRAM && isMiniProgramMenuOpen && (
        <div
          ref={mobileMiniProgramPanelRef}
          className="fixed right-4 top-16 z-[75] w-52 rounded-lg border border-gray-200 bg-white p-3 shadow-xl md:hidden"
        >
          <button
            onClick={() => setIsMiniProgramMenuOpen(false)}
            className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center text-gray-500 hover:text-gray-900"
            aria-label="Close mini program panel"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="mb-3 px-6 text-center text-sm text-gray-600">{texts.scanWechatQR}</p>
          <div className="aspect-square w-full overflow-hidden rounded-md bg-gray-50">
            <img
              src="/mini_program.jpg"
              alt={texts.miniProgram}
              className="h-full w-full object-contain p-2"
              loading="lazy"
            />
          </div>
        </div>
      )}
    </>
  );
}
