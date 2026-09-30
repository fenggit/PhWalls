'use client';

// Cloudflare Pages 部署必需，请勿删除
export const runtime = 'edge';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, Download, Mail, Monitor, Smartphone } from 'lucide-react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { useLanguage } from '@/components/LanguageProvider';
import { getAboutBrandCopy, getAboutFaqItems } from '@/lib/brand-copy';
import { buildBrandPath, normalizeCategoryType } from '@/lib/brands';
import { buildWallpaperListTitle, getTabData } from '@/lib/data';
import { getDesktopTabData } from '@/lib/desktop-data';
import { SITE_URL } from '@/lib/seo';
import { withLanguagePath, withLanguageUrl } from '@/lib/language';

export default function AboutPage() {
  const { language, setLanguage, texts } = useLanguage();
  const phoneTabs = getTabData(language).filter(
    (tab) => !tab.link && !['design', 'desktop'].includes(normalizeCategoryType(tab.type))
  );
  const desktopTabs = getDesktopTabData().filter((tab) => !tab.link);
  const copy = getAboutBrandCopy(language, phoneTabs.map((tab) => tab.title));
  const faqItems = getAboutFaqItems(language);
  const aboutUrl = withLanguageUrl(`${SITE_URL}/about`, language);

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        name: texts.aboutTitle,
        description: copy.subtitle,
        inLanguage: language,
        url: aboutUrl,
        isPartOf: {
          '@type': 'WebSite',
          name: texts.siteName,
          url: withLanguageUrl(SITE_URL, language),
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Header currentLang={language} onLanguageChange={setLanguage} />
      <main className="pt-12 md:pt-16">
        <section className="relative isolate overflow-hidden bg-gray-900 text-white" aria-labelledby="about-title">
          <Image
            src="/hero/phwalls-home-hero-v1.webp"
            alt=""
            fill
            unoptimized
            priority
            sizes="100vw"
            className="object-cover object-left md:object-center"
          />
          <div className="relative mx-auto flex min-h-[280px] max-w-7xl flex-col justify-center px-4 py-12 sm:min-h-[320px] sm:px-6 lg:px-8">
            <Link
              href={withLanguagePath('/', language)}
              aria-label={texts.aboutBackHome}
              title={texts.aboutBackHome}
              className="group inline-flex min-h-9 max-w-full self-start items-center gap-1 rounded-md pr-2 text-sm text-white/85 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 font-semibold">{copy.heroTagline}</span>
            </Link>
            <h1 id="about-title" className="mt-3 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              {texts.aboutTitle}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/95 sm:text-base">
              {copy.subtitle}
            </p>
          </div>
        </section>

        <section className="border-b border-gray-200" aria-labelledby="about-purpose">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-14 md:py-16 lg:px-8">
            <div>
              <h2 id="about-purpose" className="text-2xl font-bold text-gray-950 sm:text-3xl">{texts.aboutTrustTitle}</h2>
              <p className="mt-4 text-base leading-7 text-gray-700">{texts.missionDescription}</p>
              <p className="mt-4 text-base leading-7 text-gray-700">{texts.missionDescription2}</p>
            </div>
            <div className="grid content-start gap-5 border-t border-gray-200 pt-6 md:border-l md:border-t-0 md:pl-10 md:pt-0">
              <div className="flex gap-3">
                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
                <p className="text-sm leading-6 text-gray-700">{texts.aboutResourceDesc}</p>
              </div>
              <div className="flex gap-3">
                <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
                <p className="text-sm leading-6 text-gray-700">{texts.aboutDesktopDesc}</p>
              </div>
              <div className="flex gap-3">
                <Download className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
                <p className="text-sm leading-6 text-gray-700">{texts.aboutTrustDesc}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8" aria-labelledby="about-phone-brands">
          <div className="max-w-3xl">
            <h2 id="about-phone-brands" className="text-2xl font-bold text-gray-950 sm:text-3xl">{texts.aboutResourceTitle}</h2>
            <p className="mt-3 text-base leading-7 text-gray-700">{copy.resourceDesc}</p>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {phoneTabs.map((tab) => (
              <Link
                key={tab.type}
                href={withLanguagePath(buildBrandPath(tab.type), language)}
                className="group flex min-h-14 min-w-0 items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-2 transition-colors hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <span className="min-w-0 text-sm font-semibold leading-5 text-gray-800 group-hover:text-blue-800">
                  {buildWallpaperListTitle(tab.title, texts.wallpapersTitleSuffix)}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>

        <section className="border-y border-gray-200 bg-gray-50" aria-labelledby="about-desktop-brands">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
            <div className="max-w-3xl">
              <h2 id="about-desktop-brands" className="text-2xl font-bold text-gray-950 sm:text-3xl">{texts.aboutDesktopTitle}</h2>
              <p className="mt-3 text-base leading-7 text-gray-700">{texts.aboutDesktopDesc}</p>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {desktopTabs.map((tab) => (
                <Link
                  key={tab.type}
                  href={withLanguagePath(`/desktop/${normalizeCategoryType(tab.type)}`, language)}
                  className="group flex min-h-14 min-w-0 items-center justify-between gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 transition-colors hover:border-blue-400 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <span className="min-w-0 text-sm font-semibold leading-5 text-gray-800 group-hover:text-blue-800">
                    {buildWallpaperListTitle(tab.title, texts.wallpapersTitleSuffix)}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8" aria-labelledby="about-faq">
          <h2 id="about-faq" className="text-2xl font-bold text-gray-950 sm:text-3xl">{texts.faqTitle}</h2>
          <div className="mt-6 max-w-4xl border-t border-gray-200">
            {faqItems.map((item) => (
              <details key={item.question} className="group border-b border-gray-200 py-4">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-base font-semibold leading-6 text-gray-950 focus-visible:outline-2 focus-visible:outline-blue-600">
                  <span>{item.question}</span>
                  <span className="shrink-0 text-gray-500 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-700">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-gray-200 bg-gray-50" aria-labelledby="about-contact">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-12 sm:px-6 md:flex-row md:items-center md:justify-between md:py-14 lg:px-8">
            <div className="max-w-2xl">
              <h2 id="about-contact" className="text-2xl font-bold text-gray-950">{texts.aboutContactTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-gray-700">{texts.aboutContactDesc}</p>
            </div>
            <a href="mailto:fenggit@gmail.com" className="inline-flex min-h-11 items-center gap-2 self-start rounded-md border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-900 hover:border-blue-400 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600">
              <Mail className="h-4 w-4" aria-hidden="true" />
              fenggit@gmail.com
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
