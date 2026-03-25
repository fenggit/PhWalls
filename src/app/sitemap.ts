import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { SUPPORTED_LANGUAGES, withLanguageUrl } from '@/lib/language'
import { BRAND_CATEGORIES } from '@/lib/brands'
import {
  buildWallpaperDetailPath,
  getAllWallpaperCollections,
  parseWallpaperDate,
} from '@/lib/wallpapers';

// Sitemap 页面：输出站点静态页面和壁纸详情页索引。
export default function sitemap(): MetadataRoute.Sitemap {
  const allCollections = getAllWallpaperCollections()
  const latestCollectionDate =
    allCollections
      .map(({ collection }) => parseWallpaperDate(collection.date))
      .filter((date): date is Date => Boolean(date))
      .sort((left, right) => right.getTime() - left.getTime())[0] || new Date()

  const staticPaths: Array<{
    path: string;
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
    priority: number;
  }> = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/design', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.4 },
    ...BRAND_CATEGORIES.map((brand) => ({
      path: `/brands/${brand.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
  ]

  const routes: MetadataRoute.Sitemap = SUPPORTED_LANGUAGES.flatMap((language) =>
    staticPaths.map((entry) => ({
      url: withLanguageUrl(`${SITE_URL}${entry.path}`, language),
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }))
  )

  const detailRoutes: MetadataRoute.Sitemap = SUPPORTED_LANGUAGES.flatMap((language) =>
    allCollections.map(({ category, collection }) => ({
      url: withLanguageUrl(`${SITE_URL}${buildWallpaperDetailPath(category, collection.name)}`, language),
      lastModified: parseWallpaperDate(collection.date) || latestCollectionDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    }))
  )

  return [...routes, ...detailRoutes]
}
