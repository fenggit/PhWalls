'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getI18nTexts } from '@/lib/i18n';
import type { Language } from '@/types';
import MiniProgramModal from '@/components/MiniProgramModal';
import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_LOCAL_STORAGE_KEY,
  LANGUAGE_PREFERENCE_COOKIE_NAME,
  LANGUAGE_PREFERENCE_LOCAL_STORAGE_KEY,
  LANGUAGE_PREFERENCE_MARKER_VALUE,
  getLanguageFromPath,
  normalizeLanguage,
  resolveLanguageFromAcceptLanguage,
  withLanguagePath,
} from '@/lib/language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  texts: ReturnType<typeof getI18nTexts>;
  claimMiniProgramAutoOpen: () => boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLanguage = DEFAULT_LANGUAGE,
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [isInitialized, setIsInitialized] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const hasAutoOpenedMiniProgram = useRef(false);
  const claimMiniProgramAutoOpen = useCallback(() => {
    if (hasAutoOpenedMiniProgram.current) return false;
    hasAutoOpenedMiniProgram.current = true;
    return true;
  }, []);

  // 小程序二维码弹窗
  const [isMiniProgramOpen, setIsMiniProgramOpen] = useState(false);

  useEffect(() => {
    const pathLanguage = getLanguageFromPath(pathname);
    if (pathLanguage) document.documentElement.lang = pathLanguage;
  }, [pathname]);
  
  const persistLanguagePreference = useCallback((lang: Language) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LANGUAGE_LOCAL_STORAGE_KEY, lang);
    localStorage.setItem(
      LANGUAGE_PREFERENCE_LOCAL_STORAGE_KEY,
      LANGUAGE_PREFERENCE_MARKER_VALUE
    );
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${lang}; path=/; max-age=31536000; samesite=lax`;
    document.cookie = `${LANGUAGE_PREFERENCE_COOKIE_NAME}=${LANGUAGE_PREFERENCE_MARKER_VALUE}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = lang;
  }, []);

  const setLanguageAndPersist = useCallback((lang: Language) => {
    const fromLanguage = getLanguageFromPath(pathname) || language;
    if (fromLanguage !== lang) trackAnalyticsEvent('w_language_change', { from_language: fromLanguage, to_language: lang });
    setLanguage(lang);
    persistLanguagePreference(lang);
    if (!isInitialized) {
      setIsInitialized(true);
    }
    if (typeof window !== 'undefined' && pathname) {
      const targetPath = withLanguagePath(pathname, lang);
      const search = window.location.search || '';
      if (`${targetPath}${search}` !== `${pathname}${search}`) {
        router.replace(`${targetPath}${search}`);
      }
    }
  }, [isInitialized, language, pathname, persistLanguagePreference, router]);

  // 初始化语言设置（仅在客户端执行一次）
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized) return;
    if (/^\/(?:admin|manager)(?:\/|$)/.test(window.location.pathname)) {
      setIsInitialized(true);
      return;
    }

    const pathLanguage = getLanguageFromPath(window.location.pathname);

    if (pathLanguage) {
      setLanguage(pathLanguage);
      document.documentElement.lang = pathLanguage;
      setIsInitialized(true);
      return;
    }

    const browserLanguages = navigator.languages?.length
      ? navigator.languages.join(',')
      : navigator.language;
    const browserLanguage = resolveLanguageFromAcceptLanguage(browserLanguages);
    const hasExplicitLanguagePreference =
      localStorage.getItem(LANGUAGE_PREFERENCE_LOCAL_STORAGE_KEY) ===
      LANGUAGE_PREFERENCE_MARKER_VALUE;
    const savedLanguage = hasExplicitLanguagePreference
      ? normalizeLanguage(localStorage.getItem(LANGUAGE_LOCAL_STORAGE_KEY))
      : null;
    const serverLanguage = normalizeLanguage(document.documentElement.lang);
    const resolvedLanguage = savedLanguage || browserLanguage || serverLanguage || DEFAULT_LANGUAGE;
    setLanguage(resolvedLanguage);
    document.documentElement.lang = resolvedLanguage;
    const targetPath = withLanguagePath(window.location.pathname, resolvedLanguage);
    const search = window.location.search || '';
    router.replace(`${targetPath}${search}`);
    setIsInitialized(true);
  }, [isInitialized, router]);

  // 监听全局事件：导航栏点击“小程序”时弹出（手动打开不自动关闭）
  useEffect(() => {
    if (!isInitialized) return;

    const OPEN_EVENT_NAME = 'phwalls:open-mini-program';
    const handler = () => {
      setIsMiniProgramOpen(true);
    };

    window.addEventListener(OPEN_EVENT_NAME, handler);
    return () => window.removeEventListener(OPEN_EVENT_NAME, handler);
  }, [isInitialized]);

  const handleMiniProgramClose = () => {
    setIsMiniProgramOpen(false);
  };
  
  // Client navigation can change language without remounting the root provider.
  // The current URL is the display language.
  const currentLanguage = getLanguageFromPath(pathname) || language;
  const texts = getI18nTexts(currentLanguage);
  
  return (
    <LanguageContext.Provider value={{ language: currentLanguage, setLanguage: setLanguageAndPersist, texts, claimMiniProgramAutoOpen }}>
      <MiniProgramModal
        isOpen={isMiniProgramOpen}
        onClose={handleMiniProgramClose}
        autoClose={false}
      />
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
