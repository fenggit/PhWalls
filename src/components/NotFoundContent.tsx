'use client';

import Link from 'next/link';
import { useLanguage } from '@/components/LanguageProvider';
import { getTabData } from '@/lib/data';
import { withLanguagePath } from '@/lib/language';

export default function NotFoundContent() {
  const { language, texts } = useLanguage();
  const brandLinkTones = [
    'from-blue-50 to-cyan-50 border-blue-100',
    'from-emerald-50 to-green-50 border-emerald-100',
    'from-violet-50 to-fuchsia-50 border-violet-100',
    'from-sky-50 to-indigo-50 border-sky-100',
  ];

  const brandLinks = getTabData(language).filter((tab) => !tab.link).map((tab, index) => ({
    href: `/${tab.type}`,
    title: tab.title,
    description: texts.notFoundBrandLinksDescription,
    tone: brandLinkTones[index % brandLinkTones.length],
  }));

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.16),_transparent_38%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="px-6 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
              <div className="inline-flex items-center gap-3 rounded-full border border-blue-100 bg-blue-50/80 px-4 py-2 text-sm font-semibold text-blue-700">
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm">
                  <img src="/logo.png" alt={texts.siteName} className="h-full w-full object-cover" />
                </span>
                {texts.siteName}
              </div>

              <div className="mt-8 flex items-end gap-4">
                <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-violet-500 bg-clip-text text-7xl font-black tracking-tight text-transparent sm:text-8xl">
                  404
                </span>
                <span className="mb-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                  {texts.notFoundBadge}
                </span>
              </div>

              <h1 className="mt-6 max-w-2xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                {texts.notFoundHeroTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                {texts.notFoundHeroDescription}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={withLanguagePath('/', language)}
                  className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {texts.backToHome}
                </Link>
                <Link
                  href={withLanguagePath('/about', language)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-blue-200 hover:text-blue-600"
                >
                  {texts.aboutUs}
                </Link>
                <a
                  href={`mailto:fenggit@163.com?subject=${encodeURIComponent(`${texts.siteName} 404`)}`}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-700 transition-colors duration-200 hover:border-violet-200 hover:text-violet-600"
                >
                  {texts.notFoundReportBrokenLink}
                </a>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{texts.notFoundStatusLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{texts.notFoundStatusValue}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{texts.notFoundSeoLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{texts.notFoundSeoValue}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{texts.notFoundSupportLabel}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">fenggit@163.com</p>
                </div>
              </div>
            </div>

            <aside className="border-t border-slate-100 bg-slate-50/70 px-6 py-10 sm:px-10 lg:border-l lg:border-t-0 lg:px-10">
              <div className="max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">{texts.allWallpapers}</p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                  {texts.notFoundBrandLinksTitle}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {texts.notFoundBrandLinksDescription}
                </p>

                <div className="mt-8 space-y-4">
                  {brandLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={withLanguagePath(link.href, language)}
                      className={`group block rounded-3xl border bg-gradient-to-br ${link.tone} p-5 transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900 transition-colors group-hover:text-blue-700">
                            {link.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {link.description}
                          </p>
                        </div>
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm">
                          →
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="mx-auto mt-8 max-w-5xl px-2 text-center text-sm leading-7 text-slate-500">
          {texts.notFoundFooterNote}
        </section>
      </div>
    </main>
  );
}
