import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, withLanguageUrl } from '@/lib/language'
import { BRAND_CATEGORIES, buildBrandPath } from '@/lib/brands'
import {
  buildDesktopWallpaperDetailPath,
  getAllDesktopWallpaperCollections,
  getDesktopTabData,
  isDesktopWallpaperCategory,
} from '@/lib/desktop-wallpapers'
import { getAllHomeCollections } from '@/lib/home-index'
import {
  buildWallpaperDetailPath,
  parseWallpaperDate,
  type WallpaperCategory,
} from '@/lib/wallpaper-data';

// 新分类或迁移后的 URL 应标记真实上线时间，不能继续沿用旧设备的发布日期。
const MOBILE_ROUTE_UPDATED_AT: Partial<Record<WallpaperCategory, Date>> = {
  sony: new Date('2026-05-29T00:00:00Z'),
  poco: new Date('2026-08-11T00:00:00Z'),
  redmi: new Date('2026-08-11T00:00:00Z'),
  iqoo: new Date('2026-08-14T00:00:00Z'),
  'asus-rog-phone': new Date('2026-08-15T00:00:00Z'),
}

const DESKTOP_ROUTE_UPDATED_AT: Record<string, Date> = {
  'microsoft-windows': new Date('2026-06-09T00:00:00Z'),
  ubuntu: new Date('2026-06-09T00:00:00Z'),
  'google-chromeos': new Date('2026-06-09T00:00:00Z'),
  'google-os': new Date('2026-06-15T00:00:00Z'),
  'microsoft-surface': new Date('2026-06-18T00:00:00Z'),
}

function latestDate(...dates: Array<Date | null | undefined>): Date | undefined {
  const validDates = dates.filter((date): date is Date => Boolean(date));
  if (validDates.length === 0) return undefined;
  return new Date(Math.max(...validDates.map((date) => date.getTime())));
}

// Sitemap 页面：输出站点静态页面和壁纸详情页索引。
export default function sitemap(): MetadataRoute.Sitemap {
  const allCollections = getAllHomeCollections()
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
    lastModified?: Date;
  }> = [
    { path: '/', changeFrequency: 'weekly', priority: 1.0 },
    { path: '/desktop', changeFrequency: 'weekly', priority: 0.95 },
    { path: '/about', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/design', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.4 },
    ...getDesktopTabData()
      .filter((category) => isDesktopWallpaperCategory(category.type))
      .map((category) => ({
        path: `/desktop/${category.type}`,
        changeFrequency: 'weekly' as const,
        priority: 0.85,
        lastModified: latestDate(
          DESKTOP_ROUTE_UPDATED_AT[category.type],
          ...allDesktopCollections
            .filter((entry) => entry.category === category.type)
            .map((entry) => parseWallpaperDate(entry.collection.date))
        ),
      })),
    ...BRAND_CATEGORIES.map((brand) => ({
      path: buildBrandPath(brand.type),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
      lastModified: latestDate(
        MOBILE_ROUTE_UPDATED_AT[brand.slug],
        ...allCollections
          .filter((entry) => entry.category === brand.slug)
          .map((entry) => parseWallpaperDate(entry.collection.date))
      ),
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
      ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }
  })

  const detailRoutes: MetadataRoute.Sitemap = allCollections.map(({ category, collection }) => {
    const absolutePath = `${SITE_URL}${buildWallpaperDetailPath(category, collection.name)}`
    return {
      url: withLanguageUrl(absolutePath, DEFAULT_LANGUAGE),
      alternates: buildLanguageAlternates(absolutePath),
      lastModified:
        latestDate(parseWallpaperDate(collection.date), MOBILE_ROUTE_UPDATED_AT[category]) ||
        latestCollectionDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    }
  })

  const desktopDetailRoutes: MetadataRoute.Sitemap = allDesktopCollections.map(({ category, collection }) => {
    const absolutePath = `${SITE_URL}${buildDesktopWallpaperDetailPath(category, collection.name)}`
    return {
      url: withLanguageUrl(absolutePath, DEFAULT_LANGUAGE),
      alternates: buildLanguageAlternates(absolutePath),
      lastModified:
        latestDate(parseWallpaperDate(collection.date), DESKTOP_ROUTE_UPDATED_AT[category]) ||
        latestCollectionDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    }
  })

  return [...routes, ...detailRoutes, ...desktopDetailRoutes]
}
