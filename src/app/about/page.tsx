'use client';

// Cloudflare Pages 部署必需，请勿删除
export const runtime = 'edge';

import { Suspense } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import Footer from '@/components/Footer';
import BackNavButton from '@/components/BackNavButton';
import { useLanguage } from '@/components/LanguageProvider';
import { buildBrandPath, normalizeCategoryType } from '@/lib/brands';
import { getAboutBrandCopy, getAboutFaqItems, getFooterBrandDescription } from '@/lib/brand-copy';
import { buildWallpaperListTitle, getTabData } from '@/lib/data';
import { SITE_URL } from '@/lib/seo';
import { withLanguagePath, withLanguageUrl } from '@/lib/language';
import {
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

function AboutContent() {
  const { language, texts } = useLanguage();
  const homeHref = withLanguagePath('/', language);
  const brandTabs = getTabData(language).filter((item) => normalizeCategoryType(item.type) !== 'design');
  const brandTitles = brandTabs.map((item) => item.title);
  const dynamicAboutCopy = getAboutBrandCopy(language, brandTitles);
  const dynamicFooterDescription = getFooterBrandDescription(language, brandTitles);

  const pageCopy = {
    heroTagline: dynamicAboutCopy.heroTagline,
    subtitle: dynamicAboutCopy.subtitle,
    resourceTitle: texts.aboutResourceTitle,
    resourceDesc: dynamicAboutCopy.resourceDesc,
    trustTitle: texts.aboutTrustTitle,
    trustDesc: texts.aboutTrustDesc,
    contactTitle: texts.aboutContactTitle,
    contactDesc: texts.aboutContactDesc,
  };
  const collectionTones = [
    'from-blue-50 to-cyan-50 border-blue-100',
    'from-green-50 to-emerald-50 border-green-100',
    'from-violet-50 to-fuchsia-50 border-violet-100',
    'from-sky-50 to-indigo-50 border-sky-100',
  ];

  const collections = brandTabs.map((item, index) => ({
    href: withLanguagePath(buildBrandPath(item.type), language),
    title: buildWallpaperListTitle(item.title, texts.wallpapersTitleSuffix),
    desc:
      language === 'zh'
        ? `浏览 ${item.title} 官方壁纸合集，支持高清原图下载。`
        : language === 'zh-hant'
          ? `瀏覽 ${item.title} 官方桌布合集，支援高清原圖下載。`
          : language === 'ja'
            ? `${item.title} の公式壁紙コレクションを閲覧し、高解像度でダウンロードできます。`
            : language === 'vi'
              ? `Khám phá bộ sưu tập hình nền chính thức của ${item.title} và tải xuống chất lượng cao.`
              : `Explore official ${item.title} wallpaper collections and download them in full resolution.`,
    tone: collectionTones[index % collectionTones.length],
  }));

  const faqItems = getAboutFaqItems(language);

  const seoStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        name: texts.aboutTitle,
        description: pageCopy.subtitle,
        inLanguage: language,
        url: withLanguageUrl(`${SITE_URL}/about`, language),
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
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-sky-50">
      <Script
        id="about-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(seoStructuredData) }}
      />

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-cyan-700">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.25),transparent_40%),radial-gradient(circle_at_85%_30%,rgba(255,255,255,0.2),transparent_35%)]" />
          <div className="absolute inset-0 bg-black/15" />

          <div className="absolute left-6 top-6 z-20">
            <BackNavButton homeHref={homeHref} label={texts.returnHome} variant="light" />
          </div>

          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-28">
            <p className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-white/90 uppercase">
              {pageCopy.heroTagline}
            </p>
            <h1 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight text-white">
              {texts.aboutTitle}
            </h1>
            <p className="mt-6 max-w-3xl text-base md:text-xl leading-relaxed text-white/90">
              {pageCopy.subtitle}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-white/90">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {texts.systemNative}
              </span>
              <span className="inline-flex items-center gap-2">
                <Download className="h-4 w-4" />
                {texts.hdWatermarkFree}
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock3 className="h-4 w-4" />
                {texts.regularUpdates}
              </span>
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href={withLanguagePath('/', language)}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Sparkles className="h-4 w-4" />
                {texts.exploreButton}
              </Link>
              <Link
                href={withLanguagePath('/design', language)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                {texts.customWallpaper}
              </Link>
            </div>
          </div>
        </section>

        <section className="relative z-10 -mt-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs tracking-[0.18em] uppercase text-slate-500">{texts.systemNative}</p>
              <p className="mt-2 text-sm text-slate-600">{pageCopy.trustDesc}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs tracking-[0.18em] uppercase text-slate-500">4K / 5K / 6K</p>
              <p className="mt-2 text-sm text-slate-600">{dynamicFooterDescription}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs tracking-[0.18em] uppercase text-slate-500">{texts.faqTitle}</p>
              <p className="mt-2 text-sm text-slate-600">{texts.faqSubtitle}</p>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">
              {pageCopy.resourceTitle}
            </h2>
            <p className="mt-4 max-w-3xl text-slate-600 text-lg leading-relaxed">{pageCopy.resourceDesc}</p>

            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {collections.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group rounded-2xl border bg-gradient-to-br ${item.tone} p-5 transition-transform duration-200 hover:-translate-y-0.5`}
                >
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-700">
                    {texts.learnMore}
                    <ExternalLink className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <article className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="inline-flex items-center gap-2 text-2xl font-semibold text-slate-900">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                {pageCopy.trustTitle}
              </h2>
              <p className="mt-4 text-slate-600 leading-relaxed">{texts.missionDescription}</p>
              <p className="mt-3 text-slate-600 leading-relaxed">{texts.missionDescription2}</p>
            </article>
          </div>
        </section>

        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-6">
            <article className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-3xl font-semibold text-slate-900">{texts.faqTitle}</h2>
              <p className="mt-3 text-slate-600">{texts.faqSubtitle}</p>
              <div className="mt-8 space-y-3">
                {faqItems.map((item, index) => (
                  <details
                    key={item.question}
                    className="group rounded-2xl border border-slate-200 bg-slate-50/70 p-5 open:bg-white open:shadow-sm transition-all"
                    open={index === 0}
                  >
                    <summary className="cursor-pointer list-none font-medium text-slate-900 flex items-center justify-between gap-4">
                      <span>{item.question}</span>
                      <span className="text-slate-400 group-open:rotate-45 transition-transform">+</span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
                  </details>
                ))}
              </div>
            </article>

            <aside className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">{pageCopy.contactTitle}</h2>
              <p className="mt-3 text-slate-600 leading-relaxed">{pageCopy.contactDesc}</p>
              <div className="mt-6 space-y-3">
                <div className="inline-flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <MessageCircle className="h-4 w-4 text-slate-500" />
                  <span>{texts.qqGroup}</span>
                </div>
                <a
                  href="https://t.me/+1Ce-76yIVu4yZDg1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <MessageCircle className="h-4 w-4 text-slate-500" />
                  <span>Telegram</span>
                </a>
                <a
                  href="mailto:fenggit@163.com"
                  className="inline-flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Mail className="h-4 w-4 text-slate-500" />
                  <span>fenggit@163.com</span>
                </a>
                <Link
                  href={withLanguagePath('/privacy', language)}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  {texts.privacyPolicy}
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function AboutLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      </div>
    </div>
  );
}

// 关于页面：介绍站点定位、资源说明、FAQ 和联系信息。
export default function AboutPage() {
  return (
    <Suspense fallback={<AboutLoading />}>
      <AboutContent />
    </Suspense>
  );
}
