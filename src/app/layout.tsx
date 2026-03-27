import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/components/LanguageProvider';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import { SITE_URL } from '@/lib/seo';
import {
  buildLanguageAlternates,
  DEFAULT_LANGUAGE,
  getOpenGraphLocaleForLanguage,
  LANGUAGE_HEADER_NAME,
  isLanguage,
  withLanguageUrl,
} from '@/lib/language';
import { headers } from 'next/headers';
import { resolveMetadataLanguage } from '@/lib/metadata';
import { getI18nTexts } from '@/lib/i18n';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
});

export async function generateMetadata(): Promise<Metadata> {
  const currentLanguage = (await resolveMetadataLanguage()) || DEFAULT_LANGUAGE;
  const texts = getI18nTexts(currentLanguage);
  const title = `${texts.heroTitle} | ${texts.siteName}`;
  const description = texts.heroDescription;
  const canonicalUrl = withLanguageUrl(SITE_URL, currentLanguage);

  return {
    title,
    description,
    keywords:
      'phone wallpaper, android wallpaper, samsung wallpaper, xiaomi wallpaper, oppo wallpaper, vivo wallpaper, huawei wallpaper, HD wallpaper',
    authors: [{ name: 'PhWalls Team' }],
    creator: 'PhWalls',
    publisher: 'PhWalls',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: [
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      ],
      shortcut: '/favicon.ico',
      apple: '/logo.png',
      other: [
        {
          rel: 'icon',
          url: '/android-chrome-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          rel: 'icon',
          url: '/android-chrome-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
      ],
    },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: getOpenGraphLocaleForLanguage(currentLanguage),
      alternateLocale: ['en_US', 'zh_CN', 'ja_JP', 'vi_VN', 'zh_HK'],
      url: canonicalUrl,
      siteName: 'PhWalls',
      images: [
        {
          url: `${SITE_URL}/logo.png`,
          alt: 'PhWalls - Phone Wallpaper Collection',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/logo.png`],
      creator: '@phwalls',
      site: '@phwalls',
    },
    alternates: {
      canonical: canonicalUrl,
      languages: buildLanguageAlternates(SITE_URL),
    },
    metadataBase: new URL(SITE_URL),
    category: 'Technology',
    classification: 'Phone Wallpapers, Mobile Wallpapers',
    other: {
      'apple-mobile-web-app-title': 'PhWalls',
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'mobile-web-app-capable': 'yes',
      'theme-color': '#000000',
      'msapplication-TileColor': '#000000',
      'msapplication-config': '/browserconfig.xml',
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

// 根布局页面：为全站注入公共 metadata、脚本、语言和全局布局。
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const rawLang = headersList.get(LANGUAGE_HEADER_NAME);
  const currentLanguage = isLanguage(rawLang) ? rawLang : DEFAULT_LANGUAGE;

  return (
    <html lang={currentLanguage} className="scroll-smooth">
      <head>
        {/* Google tag (gtag.js) */}
        <Script
          id="google-tag-manager"
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-LFRHWNN448"
        />
        <Script
          id="google-tag-init"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-LFRHWNN448');
            `,
          }}
        />

        {/* <Script
          id="baidu-analytics"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              var _hmt = _hmt || [];
              (function() {
                var hm = document.createElement("script");
                hm.src = "https://hm.baidu.com/hm.js?0ae1c5f4a68fa083083259227ed8d4e2";
                var s = document.getElementsByTagName("script")[0];
                s.parentNode.insertBefore(hm, s);
              })();
            `,
          }}
        /> */}

        {/* 资源提示优化 */}
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Schema.org 结构化数据 - Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'PhWalls',
              url: SITE_URL,
              logo: `${SITE_URL}/logo.png`,
              description: 'Download built-in HD phone wallpapers. High-quality, watermark-free collections.',
              contactPoint: {
                '@type': 'ContactPoint',
                email: 'fenggit@163.com',
                contactType: 'Customer Service'
              },
              sameAs: [
                'https://twitter.com/phwalls',
                'https://www.pinterest.com/phwalls/',
              ]
            })
          }}
        />

        {/* Schema.org 结构化数据 - WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'PhWalls',
              url: SITE_URL,
              description: 'Download built-in HD wallpapers for popular phone brands',
              inLanguage: ['en', 'zh-CN', 'ja', 'vi', 'zh-Hant'],
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${SITE_URL}/?q={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            })
          }}
        />

      </head>
      <body className={`${inter.className} antialiased bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen`}>
        <LanguageProvider initialLanguage={currentLanguage}>
          <div id="__next">
            {children}
          </div>
        </LanguageProvider>
      </body>
    </html>
  );
}
