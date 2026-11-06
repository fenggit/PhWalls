import { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'
import { buildLanguageAlternates, SUPPORTED_LANGUAGES, withLanguageUrl } from '@/lib/language'
import { getIndexableDetailLanguages } from '@/lib/seo-indexing'
import type { Language } from '@/types'
import { BRAND_CATEGORIES, buildBrandPath } from '@/lib/brands'
import {
  buildDesktopWallpaperDetailPath,
  getDesktopTabData,
  isDesktopWallpaperCategory,
} from '@/lib/desktop-wallpapers'
import { getAllHomeCollections } from '@/lib/home-index'
import { loadDbIndex } from '@/lib/wallpaper-db'
import { getLiveTabData, buildLiveWallpaperDetailPath } from '@/lib/live-data'
import { LIVE_WALLPAPERS_PATH, buildLiveCategoryPath } from '@/lib/live-paths'
import { loadLiveIndex } from '@/lib/live-data-server'
import { getWallpaperCollectionMedia } from '@/lib/wallpaper-media'
import { WALLPAPER_THEMES, themePath } from '@/lib/wallpaper-themes'
import { loadThemeWallpapers } from '@/lib/wallpaper-theme-db'
import {
  buildWallpaperDetailPath,
  parseWallpaperDate,
  type WallpaperCategory,
  type WallpaperCollection,
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
  'omarchy-linux': new Date('2026-09-20T00:00:00Z'),
}

function latestDate(...dates: Array<Date | null | undefined>): Date | undefined {
  const validDates = dates.filter((date): date is Date => Boolean(date));
  if (validDates.length === 0) return undefined;
  return new Date(Math.max(...validDates.map((date) => date.getTime())));
}

// Sitemap 页面：输出站点静态页面和壁纸详情页索引。
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const allCollections = await getAllHomeCollections()
  const liveIndex = await loadLiveIndex()
  const liveUpdatedAt = new Date('2026-10-07T00:00:00+08:00')
  const liveLandingUpdatedAt = new Date('2026-10-09T00:00:00+08:00')
  const allDesktopCollections = Object.entries(await loadDbIndex(getDesktopTabData().map((tab) => tab.type)))
    .flatMap(([category, list]) => list.map((collection) => ({ category, collection })))
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
    { path: LIVE_WALLPAPERS_PATH, changeFrequency: 'weekly', priority: 0.95, lastModified: liveLandingUpdatedAt },
    ...getLiveTabData().filter((tab) => liveIndex[tab.type]?.length).map((tab) => ({
      path: buildLiveCategoryPath(tab.type), changeFrequency: 'weekly' as const, priority: 0.85, lastModified: liveLandingUpdatedAt,
    })),
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

  // 每条路由记录可索引语言；sitemap 只列出这些语言的 URL，hreflang 也只互指这些版本。
  type LocalizedRoute = Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'> & {
    absolutePath: string;
    languages: Language[];
  }
  const collectionCount = (collection: WallpaperCollection) => collection.count ?? collection.item.length

  const routes: LocalizedRoute[] = staticPaths.map((entry) => ({
    absolutePath: `${SITE_URL}${entry.path}`,
    languages: SUPPORTED_LANGUAGES,
    ...(entry.lastModified ? { lastModified: entry.lastModified } : {}),
    changeFrequency: entry.changeFrequency,
    priority: entry.priority,
  }))

  const detailRoutes: LocalizedRoute[] = allCollections.map(({ category, collection }) => ({
    absolutePath: `${SITE_URL}${buildWallpaperDetailPath(category, collection.slug || collection.name)}`,
    languages: getIndexableDetailLanguages(category, collectionCount(collection)),
    lastModified:
      latestDate(parseWallpaperDate(collection.date), MOBILE_ROUTE_UPDATED_AT[category]) ||
      latestCollectionDate,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const desktopDetailRoutes: LocalizedRoute[] = allDesktopCollections.map(({ category, collection }) => ({
    absolutePath: `${SITE_URL}${buildDesktopWallpaperDetailPath(category, collection.slug || collection.name, getWallpaperCollectionMedia(collection))}`,
    languages: getIndexableDetailLanguages(category, collectionCount(collection)),
    lastModified:
      latestDate(parseWallpaperDate(collection.date), DESKTOP_ROUTE_UPDATED_AT[category]) ||
      latestCollectionDate,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  // hreflang 替代链接不能代替各语言页面自身的 <url><loc> 条目。
  const liveDetailRoutes: LocalizedRoute[] = Object.entries(liveIndex).flatMap(([category, list]) => list.map((collection) => ({
    absolutePath: `${SITE_URL}${buildLiveWallpaperDetailPath(category, collection.slug || collection.name)}`,
    languages: getIndexableDetailLanguages(category, collectionCount(collection)),
    lastModified: liveUpdatedAt, changeFrequency: 'monthly' as const, priority: 0.8,
  })));
  // Legacy JSON can contain multiple collections with the same canonical slug.
  const uniqueRoutes = Array.from(new Map(
    [...routes, ...detailRoutes, ...desktopDetailRoutes, ...liveDetailRoutes].map((route) => [route.absolutePath, route])
  ).values());
  const themeRoutes = (await Promise.all(WALLPAPER_THEMES.map(async theme => {
    const items = await loadThemeWallpapers(theme);
    if (!items.length) return [];
    const absolutePath = `${SITE_URL}/themes/${theme.slug}`;
    const alternates = { languages: buildLanguageAlternates(absolutePath) };
    return SUPPORTED_LANGUAGES.map(language => ({ url: `${SITE_URL}${themePath(theme, language)}`, alternates,
      lastModified: new Date(Math.max(...items.map(item => item.updatedAt))),
      changeFrequency: 'monthly' as const, priority: 0.7 }));
  }))).flat();
  return [...uniqueRoutes.flatMap(({ absolutePath, languages, ...route }) => {
    const alternates = { languages: buildLanguageAlternates(absolutePath, languages) }
    return languages.map((language) => ({ ...route, url: withLanguageUrl(absolutePath, language), alternates }))
  }), ...themeRoutes]
}
