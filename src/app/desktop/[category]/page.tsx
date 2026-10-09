import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoLandingPage from "@/components/SeoLandingPage";
import {
 isDesktopWallpaperCategory,
 getDesktopWallpaperCategoryLabel,
} from "@/lib/desktop-data";
import { loadDesktopWallpaperCollectionIndex } from '@/lib/desktop-data-server';
import { sortByDateDesc } from "@/lib/data";
import { getWallpaperCollectionMedia } from '@/lib/wallpaper-media';
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from "@/lib/language";
import { resolveMetadataLanguage } from "@/lib/metadata";
import { getDesktopCategorySeoCopy } from "@/lib/desktop-seo";
import { SITE_URL } from "@/lib/seo";
import { DEFAULT_OPEN_GRAPH_IMAGES, DEFAULT_X_IMAGES } from "@/lib/social-metadata";

export const runtime = "edge";

type DesktopCategoryPageProps = {
 params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: DesktopCategoryPageProps): Promise<Metadata> {
 const { category } = await params;
 if (!isDesktopWallpaperCategory(category)) return {};
 const language = await resolveMetadataLanguage();
 const label = getDesktopWallpaperCategoryLabel(category);
 const seoCopy = getDesktopCategorySeoCopy(language, category, label);
 const canonicalUrl = withLanguageUrl(`${SITE_URL}/desktop/${category}`, language);
 const title = `${seoCopy.metadataTitle} | PhWalls`;
 const description = seoCopy.description;
 return {
  title,
  description,
  alternates: {
   canonical: canonicalUrl,
   languages: buildLanguageAlternates(`${SITE_URL}/desktop/${category}`),
  },
  openGraph: { title, description, url: canonicalUrl, type: "website", locale: getOpenGraphLocaleForLanguage(language), images: DEFAULT_OPEN_GRAPH_IMAGES },
  twitter: { card: "summary_large_image", title, description, images: DEFAULT_X_IMAGES },
 };
}


export default async function DesktopCategoryPage({ params }: DesktopCategoryPageProps) {
 const { category } = await params;
 if (!isDesktopWallpaperCategory(category)) notFound();
 const label = getDesktopWallpaperCategoryLabel(category);
  const language = await resolveMetadataLanguage();
 const collections = sortByDateDesc(await loadDesktopWallpaperCollectionIndex(category, language));
 const cards = collections.map((c) => ({
  deviceId: c.deviceId,
  name: c.name,
  slug: c.slug,
  date: c.date,
  count: c.count ?? c.item?.length ?? 0,
  imageKey: c.item?.[0]?.compressPath || c.item?.[0]?.originPath || null,
  isLive: getWallpaperCollectionMedia(c) === 'dynamic',
 }));
 const seoCopy = getDesktopCategorySeoCopy(language, category, label, cards.length);
 return (
  <SeoLandingPage
   breadcrumbLabel={seoCopy.title}
   categoryKey={category}
   categoryPath={`/desktop/${category}`}
   detailCategory={category}
   detailPathPrefix="/desktop/wallpapers"
   seoTitle={seoCopy.title}
   seoDescription={seoCopy.description}
   seoSubtitle={seoCopy.subtitle}
   cardAspect="aspect-[16/10]"
   gridClass="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
   cards={cards}
  />
 );
}
