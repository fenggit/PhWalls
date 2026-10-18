'use client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/components/LanguageProvider';
import type { ReactNode } from 'react';

export default function ThemePageChrome({ children }: { children: ReactNode }) {
  const { language, setLanguage } = useLanguage();
  return <div className="min-h-[100dvh] bg-white text-gray-900">
    <Header currentLang={language} onLanguageChange={setLanguage} />
    {children}
    <Footer />
  </div>;
}
