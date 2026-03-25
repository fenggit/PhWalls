'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getI18nTexts } from '@/lib/i18n';
import type { Language } from '@/types';
import MiniProgramModal from '@/components/MiniProgramModal';
import { analytics } from '@/lib/analytics';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
  getLanguageFromPath,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
  withLanguagePath,
} from '@/lib/language';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  texts: ReturnType<typeof getI18nTexts>;
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

  // 小程序二维码弹窗
  const [isMiniProgramOpen, setIsMiniProgramOpen] = useState(false);
  const [hasSentContext, setHasSentContext] = useState(false);
  
  const persistLanguage = useCallback((lang: Language) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('language', lang);
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${lang}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = lang;
  }, []);

  const setLanguageAndPersist = useCallback((lang: Language) => {
    setLanguage(lang);
    persistLanguage(lang);
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
  }, [isInitialized, pathname, persistLanguage, router]);

  // 初始化语言设置（仅在客户端执行一次）
  useEffect(() => {
    if (typeof window === 'undefined' || isInitialized) return;

    const savedLanguage = normalizeLanguage(localStorage.getItem('language'));
    const pathLanguage = getLanguageFromPath(window.location.pathname);

    if (pathLanguage) {
      setLanguage(pathLanguage);
      persistLanguage(pathLanguage);
      setIsInitialized(true);
      return;
    }

    if (savedLanguage) {
      setLanguage(savedLanguage);
      persistLanguage(savedLanguage);
      const targetPath = withLanguagePath(window.location.pathname, savedLanguage);
      const search = window.location.search || '';
      router.replace(`${targetPath}${search}`);
      setIsInitialized(true);
      return;
    }

    const ipLanguage = normalizeLanguage(document.documentElement.lang);
    const resolvedLanguage = ipLanguage && SUPPORTED_LANGUAGES.includes(ipLanguage) ? ipLanguage : DEFAULT_LANGUAGE;
    setLanguage(resolvedLanguage);
    persistLanguage(resolvedLanguage);
    const targetPath = withLanguagePath(window.location.pathname, resolvedLanguage);
    const search = window.location.search || '';
    router.replace(`${targetPath}${search}`);
    setIsInitialized(true);
  }, [isInitialized, persistLanguage, router]);

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

  useEffect(() => {
    if (!isMiniProgramOpen) return;
    analytics.miniProgram({ action: 'open' });
  }, [isMiniProgramOpen]);

  useEffect(() => {
    if (!isInitialized || hasSentContext || typeof window === 'undefined') return;
    const system = navigator.userAgent || 'unknown';
    analytics.deviceInfo({
      system,
      language,
    });
    setHasSentContext(true);
  }, [hasSentContext, isInitialized, language]);

  const handleMiniProgramClose = () => {
    analytics.miniProgram({ action: 'close' });
    setIsMiniProgramOpen(false);
  };
  
  const texts = getI18nTexts(language);
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLanguageAndPersist, texts }}>
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
