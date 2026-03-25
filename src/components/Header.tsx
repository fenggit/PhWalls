'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Globe } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { Language, LanguageCode, TabInfo } from '@/types';
import { getI18nTexts, I18nTexts } from '@/lib/i18n';
import { buildBrandPath, normalizeCategoryType } from '@/lib/brands';
import { stripLanguagePrefix, withLanguagePath } from '@/lib/language';

export interface HeaderProps {
  tabData: TabInfo[];
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
}

const languageConfig: Record<Language, { flag: string; name: string; key: keyof I18nTexts; priority: number }> = {
  [LanguageCode.EN]: { flag: '🇺🇸', name: 'english', key: 'english', priority: 1 },
  [LanguageCode.ZH]: { flag: '🇨🇳', name: 'chineseSimplified', key: 'chineseSimplified', priority: 2 },
  [LanguageCode.JA]: { flag: '🇯🇵', name: 'japanese', key: 'japanese', priority: 3 },
  [LanguageCode.VI]: { flag: '🇻🇳', name: 'vietnamese', key: 'vietnamese', priority: 4 },
  [LanguageCode.ZH_HANT]: { flag: '🇭🇰', name: 'chineseTraditional', key: 'chineseTraditional', priority: 5 },
};

const languageOrder: Language[] = [
  LanguageCode.EN,
  LanguageCode.ZH,
  LanguageCode.JA,
  LanguageCode.VI,
  LanguageCode.ZH_HANT,
];

export default function Header({ tabData, currentLang, onLanguageChange }: HeaderProps) {
  const [isDeviceMenuOpen, setIsDeviceMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isMiniProgramMenuOpen, setIsMiniProgramMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const miniProgramMenuRef = useRef<HTMLDivElement>(null);
  const mobileMiniProgramPanelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const getLandingPathByCategoryType = useCallback(
    (categoryType: string): string | null => {
      const normalizedType = normalizeCategoryType(categoryType);

      if (normalizedType === 'design') return '/design';
      return buildBrandPath(categoryType);
    },
    []
  );

  const getActiveTypeFromPath = useCallback((currentPath: string): string => {
    const normalizedPath = stripLanguagePrefix(currentPath).path;
    if (normalizedPath === '/') return 'all';
    if (normalizedPath === '/design') return 'design';
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

  const [activeMobileType, setActiveMobileType] = useState(() => getActiveTypeFromPath(pathname));

  const texts = getI18nTexts(currentLang);
  const mobileAllLabel =
    currentLang === LanguageCode.ZH || currentLang === LanguageCode.ZH_HANT
      ? '全部'
      : currentLang === LanguageCode.JA
        ? 'すべて'
        : currentLang === LanguageCode.VI
          ? 'Tất cả'
          : 'All';

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const nextIsScrolled = scrollTop > 50;
      setIsScrolled((prev) => (prev === nextIsScrolled ? prev : nextIsScrolled));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setActiveMobileType(getActiveTypeFromPath(pathname));
  }, [getActiveTypeFromPath, pathname]);

  const getCategoryHref = useCallback(
    (categoryType: string): string | null => {
      const targetPath = getLandingPathByCategoryType(categoryType);
      if (!targetPath) return null;
      return withLanguagePath(targetPath, currentLang);
    },
    [currentLang, getLandingPathByCategoryType]
  );

  const handleCategorySelect = useCallback(
    (categoryType: string) => {
      const normalizedType = normalizeCategoryType(categoryType);
      setActiveMobileType((prev) => (prev === normalizedType ? prev : normalizedType));

      setIsDeviceMenuOpen(false);
      setIsLanguageMenuOpen(false);
      setIsMiniProgramMenuOpen(false);
    },
    []
  );

  const handleLanguageChange = (lang: Language) => {
    onLanguageChange(lang);
  };

  const getDesktopTabButtonClass = (isActive: boolean) => {
    return [
      'px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
      'whitespace-nowrap',
      isActive
        ? 'text-blue-700 bg-blue-50/90'
        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/80',
    ].join(' ');
  };

  const handleMiniProgramClick = () => {
    setIsMiniProgramMenuOpen((prev) => !prev);
    setIsLanguageMenuOpen(false);
    setIsDeviceMenuOpen(false);
  };

  const closeMobileMenus = () => {
    setIsDeviceMenuOpen(false);
    setIsLanguageMenuOpen(false);
    setIsMiniProgramMenuOpen(false);
  };

  useEffect(() => {
    if (!isMiniProgramMenuOpen) return;

    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        return;
      }

      const target = event.target as Node;
      const isDesktopInside = miniProgramMenuRef.current?.contains(target);
      const isMobileInside = mobileMiniProgramPanelRef.current?.contains(target);

      if (!isDesktopInside && !isMobileInside) {
        setIsMiniProgramMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMiniProgramMenuOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const normalizedPath = stripLanguagePrefix(window.location.pathname).path;
    if (normalizedPath !== '/') return;

    setIsMiniProgramMenuOpen(true);
  }, []);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50' 
          : 'bg-white/80 backdrop-blur-md border-b border-gray-200/50'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-12 md:h-16 relative">
          <div className="flex-shrink-0">
            <Link
              href={withLanguagePath('/', currentLang)}
              className="inline-flex items-center gap-1.5 md:gap-2 text-lg md:text-2xl font-bold text-gray-900 tracking-tight hover:text-blue-600 transition-colors duration-200 cursor-pointer"
            >
              <span className="relative h-5 w-5 md:h-7 md:w-7 overflow-hidden rounded-md bg-white">
                <img
                  src="/logo.png"
                  alt={`${texts.siteName} logo`}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              </span>
              {texts.siteName}
            </Link>
          </div>

          <div className="hidden lg:block absolute left-1/2 transform -translate-x-1/2">
            <div className="flex items-center space-x-1">
              {tabData.map((category) => {
                const isActive = normalizeCategoryType(category.type) === activeMobileType;
                const href = getCategoryHref(category.type);
                return href ? (
                  <Link
                    key={category.type}
                    href={href}
                    className={getDesktopTabButtonClass(isActive)}
                    title={category.title}
                    prefetch
                  >
                    {category.title}
                  </Link>
                ) : (
                  <button
                    key={category.type}
                    onClick={() => handleCategorySelect(category.type)}
                    className={getDesktopTabButtonClass(isActive)}
                    title={category.title}
                  >
                    {category.title}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-4 flex-shrink-0 ml-auto">
            <div
              className="hidden md:block relative"
              ref={miniProgramMenuRef}
              onMouseEnter={() => setIsMiniProgramMenuOpen(true)}
              onMouseLeave={() => setIsMiniProgramMenuOpen(false)}
            >
              <button
                onClick={handleMiniProgramClick}
                aria-expanded={isMiniProgramMenuOpen}
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200 px-3 py-2 rounded-md hover:bg-blue-50"
              >
                {texts.miniProgram}
              </button>

              {isMiniProgramMenuOpen && (
                <div className="absolute -right-[70px] mt-2 w-[200px] min-w-[200px] max-w-none bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-100 z-[80] p-3">
                  <button
                    onClick={() => setIsMiniProgramMenuOpen(false)}
                    className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-base font-semibold text-gray-500 hover:text-gray-700"
                    aria-label="Close mini program panel"
                  >
                    ×
                  </button>
                  <p className="text-sm text-gray-600 text-center mb-3 whitespace-nowrap px-6">{texts.scanWechatQR}</p>
                  <div className="w-full aspect-square rounded-md overflow-hidden bg-gray-50">
                    <img
                      src="/mini_program.jpg"
                      alt={texts.miniProgram}
                      className="w-full h-full object-contain p-2"
                      loading="lazy"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="hidden md:block">
              <Link
                href={withLanguagePath('/about', currentLang)}
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200 px-3 py-2 rounded-md hover:bg-blue-50"
              >
                {texts.about}
              </Link>
            </div>
            
            <div className="relative group flex-shrink-0">
              <div className="relative">
                <button
                  onClick={() => {
                    setIsLanguageMenuOpen((prev) => !prev);
                    setIsDeviceMenuOpen(false);
                    setIsMiniProgramMenuOpen(false);
                  }}
                  className={`flex items-center text-sm transition-all duration-200 px-3 py-2 rounded-lg hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 active:bg-gradient-to-r active:from-blue-50 active:to-purple-50 ${
                    isLanguageMenuOpen
                      ? 'text-gray-900 bg-gradient-to-r from-blue-50 to-purple-50'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  aria-label="Change language"
                >
                  <Globe className="w-4 h-4" />
                </button>
                
                <div className="hidden md:block absolute left-1/2 -translate-x-1/2 mt-2 min-w-[140px] w-auto bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform scale-95 group-hover:scale-100 z-50 overflow-hidden whitespace-nowrap">
                  <div className="py-2">
                    {languageOrder.map((lang) => {
                      const config = languageConfig[lang];
                      return (
                        <button
                          key={lang}
                          onClick={() => handleLanguageChange(lang)}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-200 flex items-center space-x-3 whitespace-nowrap ${
                            currentLang === lang 
                              ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium' 
                              : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 hover:text-gray-900'
                          }`}
                        >
                          <span className="whitespace-nowrap">{texts[config.name as keyof typeof texts]}</span>
                          {currentLang === lang && (
                            <svg className="w-4 h-4 ml-auto text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:hidden">
              <button
                onClick={() => {
                  setIsDeviceMenuOpen((prev) => !prev);
                  setIsLanguageMenuOpen(false);
                  setIsMiniProgramMenuOpen(false);
                }}
                className="text-gray-700 hover:text-blue-600 focus:outline-none focus:text-blue-600"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isDeviceMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

          <div className="lg:hidden pb-1.5 border-t border-gray-100/80">
            <div className="pt-1.5 overflow-x-auto scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="inline-flex items-center gap-1.5 min-w-full" role="tablist" aria-label="Device categories">
                <Link
                  key="all"
                  href={withLanguagePath('/', currentLang)}
                  className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                    activeMobileType === 'all'
                      ? 'text-blue-700 bg-blue-50 border-blue-200 shadow-sm'
                      : 'text-gray-600 bg-white border-transparent hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  role="tab"
                  aria-selected={activeMobileType === 'all'}
                  prefetch
                >
                  {mobileAllLabel}
                </Link>
                {tabData.map((category) => {
                  const isActive = normalizeCategoryType(category.type) === activeMobileType;
                  const href = getCategoryHref(category.type);

                  return href ? (
                    <Link
                      key={category.type}
                      href={href}
                      onClick={() => handleCategorySelect(category.type)}
                      className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                        isActive
                          ? 'text-blue-700 bg-blue-50 border-blue-200 shadow-sm'
                          : 'text-gray-600 bg-white border-transparent hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      role="tab"
                      aria-selected={isActive}
                      prefetch
                    >
                      {category.title}
                    </Link>
                  ) : (
                    <button
                      key={category.type}
                      onClick={() => handleCategorySelect(category.type)}
                      className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
                        isActive
                          ? 'text-blue-700 bg-blue-50 border-blue-200 shadow-sm'
                          : 'text-gray-600 bg-white border-transparent hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      role="tab"
                      aria-selected={isActive}
                    >
                      {category.title}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </nav>

      {isMiniProgramMenuOpen && (
        <div
          ref={mobileMiniProgramPanelRef}
          className="md:hidden fixed top-16 right-4 w-52 max-w-none bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-gray-100 z-[75] p-3"
        >
          <button
            onClick={() => setIsMiniProgramMenuOpen(false)}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-base font-semibold text-gray-500 hover:text-gray-700"
            aria-label="Close mini program panel"
          >
            ×
          </button>
          <p className="text-sm text-gray-600 text-center mb-3 px-6">{texts.scanWechatQR}</p>
          <div className="w-full aspect-square rounded-md overflow-hidden bg-gray-50">
            <img
              src="/mini_program.jpg"
              alt={texts.miniProgram}
              className="w-full h-full object-contain p-2"
              loading="lazy"
            />
          </div>
        </div>
      )}

      {isLanguageMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[70]">
          <button
            type="button"
            onClick={closeMobileMenus}
            className="absolute inset-0"
            aria-label="Close language menu"
          />
          <div
            className="absolute top-14 right-4 min-w-[140px] w-auto bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-gray-100 z-[71] overflow-hidden whitespace-nowrap"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="py-2">
              {languageOrder.map((lang) => {
                const config = languageConfig[lang];
                return (
                  <button
                    key={lang}
                    onClick={() => {
                      handleLanguageChange(lang);
                      setIsLanguageMenuOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-200 flex items-center space-x-3 whitespace-nowrap ${
                      currentLang === lang
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 hover:text-gray-900'
                    }`}
                  >
                    <span className="whitespace-nowrap">{texts[config.name as keyof typeof texts]}</span>
                    {currentLang === lang && (
                      <svg className="w-4 h-4 ml-auto text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {isDeviceMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[70]">
          <button
            type="button"
            onClick={closeMobileMenus}
            className="absolute inset-0"
            aria-label="Close device menu"
          />
          <div
            className="absolute top-14 right-2 w-36 bg-white rounded-xl shadow-md border border-gray-200/60 p-2"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-1">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('phwalls:open-mini-program'));
                  }
                  setIsDeviceMenuOpen(false);
                }}
                className="flex items-center space-x-2 w-full text-left text-gray-700 hover:text-blue-600 transition-colors duration-200 min-h-[40px] px-2 rounded-md hover:bg-gray-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">{texts.miniProgram}</span>
              </button>

              <Link
                href={withLanguagePath('/about', currentLang)}
                onClick={() => {
                  setIsDeviceMenuOpen(false);
                }}
                className="flex items-center space-x-2 w-full text-left text-gray-700 hover:text-blue-600 transition-colors duration-200 min-h-[40px] px-2 rounded-md hover:bg-gray-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">{texts.about}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
