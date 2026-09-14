import type { Language } from '@/types';
import { getI18nTexts } from '@/lib/i18n';
import { getBrandCategoryBySlug } from '@/lib/brands';
import { getAboutBrandCopy, getBrandTitlesFromTabs } from '@/lib/brand-copy';
import { getCategoryLabelForLanguage, getCategorySeoCopy } from '@/lib/seo';
import { isWallpaperCategory, loadWallpaperCollection } from '@/lib/wallpaper-data';
import { buildWallpaperCollectionSeoCopy } from '@/lib/wallpaper-seo';
import {
  getDesktopWallpaperCategoryLabel,
  isDesktopWallpaperCategory,
  loadDesktopWallpaperCollection,
} from '@/lib/desktop-data';
import {
  buildDesktopDetailSeoCopy,
  getDesktopCategorySeoCopy,
  getDesktopHomeSeoCopy,
} from '@/lib/desktop-seo';

// Next.js 15.5 的 Edge 入口固定启用 streaming metadata，description 会落入 body。
// 为根布局的显式 head 复用各页面的文案生成器，仅按需读取当前详情所属品牌。
// path 来自中间件规范化后的 REQUEST_PATH_HEADER_NAME，不含语言前缀。
export async function resolveRouteDescription(path: string, language: Language): Promise<string | null> {
  const texts = getI18nTexts(language);
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return texts.heroDescription;

  if (segments.length === 1) {
    switch (segments[0]) {
      case 'about':
        return getAboutBrandCopy(language, getBrandTitlesFromTabs(language)).subtitle;
      case 'privacy':
        return texts.privacyPolicySubtitle;
      case 'design':
        return texts.customWallpaperDescription;
      case 'desktop':
        return getDesktopHomeSeoCopy(language).description;
      default: {
        const brand = getBrandCategoryBySlug(segments[0]);
        return brand ? getCategorySeoCopy(language, brand.slug).description : null;
      }
    }
  }

  if (segments.length === 3 && segments[0] === 'wallpapers') {
    const [, category, slug] = segments;
    if (!isWallpaperCategory(category)) return null;
    const collection = await loadWallpaperCollection(category, slug);
    return collection
      ? buildWallpaperCollectionSeoCopy(language, collection, getCategoryLabelForLanguage(language, category)).description
      : null;
  }

  if (segments[0] === 'desktop') {
    if (segments.length === 2 && isDesktopWallpaperCategory(segments[1])) {
      const category = segments[1];
      return getDesktopCategorySeoCopy(language, category, getDesktopWallpaperCategoryLabel(category)).description;
    }
    if (segments.length === 4 && segments[1] === 'wallpapers') {
      const [, , category, slug] = segments;
      if (!isDesktopWallpaperCategory(category)) return null;
      const collection = await loadDesktopWallpaperCollection(category, slug);
      return collection
        ? buildDesktopDetailSeoCopy(language, {
            collectionName: collection.name,
            categoryLabel: getDesktopWallpaperCategoryLabel(category),
            count: collection.item.length,
          }).description
        : null;
    }
  }

  // 未知路由和不存在的合集保持 404 语义，不套用首页描述。
  return null;
}
