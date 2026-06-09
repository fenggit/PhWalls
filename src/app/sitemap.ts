import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, withLanguageUrl } from '@/lib/language'
import { BRAND_CATEGORIES, buildBrandPath } from '@/lib/brands'
import {
  buildDesktopWallpaperDetailPath,
  getAllDesktopWallpaperCollections,
} from '@/lib/desktop-wallpapers'
import {
  buildWallpaperDetailPath,
  getAllWallpaperCollections,
  parseWallpaperDate,
} from '@/lib/wallpapers';

// Sitemap 页面：输出站点静态页面和壁纸详情页索引。
export default function sitemap(): MetadataRoute.Sitemap {
  const allCollections = getAllWallpaperCollections()
  const allDesktopCollections = getAllDesktopWallpaperCollections()
  const latestCollectionDate =
    [...allCollections, ...allDesktopCollections]
      .map(({ collection }) => parseWallpaperDate(collection.date))
      .filter((date): date is Date => Boolean(date))
      .sort((left, right) => right.getTime() - left.getTime())[0] || new Date()

  const staticPaths: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority: number;
  }> = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/desktop', changeFrequency: 'weekly', priority: 0.95 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/design', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.4 },
    ...BRAND_CATEGORIES.map((brand) => ({
      path: buildBrandPath(brand.type),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ]

  const buildLanguageAlternates = (absolutePath: string) => ({
    languages: Object.fromEntries(
      SUPPORTED_LANGUAGES.map((language) => [language, withLanguageUrl(absolutePath, language)])
    ),
  })

  const routes: MetadataRoute.Sitemap = staticPaths.map((entry) => {
    const absolutePath = `${SITE_URL}${entry.path}`
    return {
      url: withLanguageUrl(absolutePath, DEFAULT_LANGUAGE),
      alternates: buildLanguageAlternates(absolutePath),
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }
  })

  const detailRoutes: MetadataRoute.Sitemap = allCollections.map(({ category, collection }) => {
    const absolutePath = `${SITE_URL}${buildWallpaperDetailPath(category, collection.name)}`
    return {
      url: withLanguageUrl(absolutePath, DEFAULT_LANGUAGE),
      alternates: buildLanguageAlternates(absolutePath),
      lastModified: parseWallpaperDate(collection.date) || latestCollectionDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    }
  })

  const desktopDetailRoutes: MetadataRoute.Sitemap = allDesktopCollections.map(({ category, collection }) => {
    const absolutePath = `${SITE_URL}${buildDesktopWallpaperDetailPath(category, collection.name)}`
    return {
      url: withLanguageUrl(absolutePath, DEFAULT_LANGUAGE),
      alternates: buildLanguageAlternates(absolutePath),
      lastModified: parseWallpaperDate(collection.date) || latestCollectionDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    }
  })

  return [...routes, ...detailRoutes, ...desktopDetailRoutes]
}
