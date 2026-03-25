'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from './LanguageProvider';
import { stripLanguagePrefix, withLanguagePath, withLanguageUrl } from '@/lib/language';
import { SITE_URL } from '@/lib/seo';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const { language, texts } = useLanguage();
  const normalizedPath = stripLanguagePrefix(pathname).path;
  
  // 如果是首页，不显示面包屑
  if (normalizedPath === '/') {
    return null;
  }
  
  const breadcrumbs: BreadcrumbItem[] = [
    { label: texts.siteName, href: '/' }
  ];
  
  // 根据路径生成面包屑
  if (normalizedPath === '/about') {
    breadcrumbs.push({ label: texts.aboutUs, href: '/about' });
  }
  
  return (
    <>
      {/* 面包屑导航 UI */}
      <nav 
        aria-label="Breadcrumb" 
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-4"
      >
        <ol className="flex items-center space-x-2 text-sm text-gray-600">
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.href} className="flex items-center">
              {index > 0 && (
                <svg 
                  className="w-4 h-4 mx-2 text-gray-400" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="font-medium text-gray-900" aria-current="page">
                  {crumb.label}
                </span>
              ) : (
                <Link 
                  href={withLanguagePath(crumb.href, language)}
                  className="hover:text-blue-600 transition-colors"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      
      {/* Schema.org BreadcrumbList 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: breadcrumbs.map((crumb, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: crumb.label,
              item: withLanguageUrl(`${SITE_URL}${crumb.href}`, language)
            }))
          })
        }}
      />
    </>
  );
}
