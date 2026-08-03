import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SeoLandingPage from "@/components/SeoLandingPage";
import {
 isDesktopWallpaperCategory,
 loadDesktopWallpaperCollections,
 getDesktopWallpaperCategoryLabel,
 getDesktopTabData,
} from "@/lib/desktop-data";
import { sortByDateDesc } from "@/lib/data";
import { buildLanguageAlternates, getOpenGraphLocaleForLanguage, withLanguageUrl } from "@/lib/language";
import { resolveMetadataLanguage } from "@/lib/metadata";
import { getDesktopCategorySeoCopy } from "@/lib/desktop-seo";
import { SITE_URL } from "@/lib/seo";

export const runtime = "edge";

type DesktopCategoryPageProps = {
 params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: DesktopCategoryPageProps): Promise<Metadata> {
 const { category } = await params;
 if (!isDesktopWallpaperCategory(category)) return {};
 const language = await resolveMetadataLanguage();
 const label = getDesktopWallpaperCategoryLabel(category);
 const seoCopy = getDesktopCategorySeoCopy(language, label);
 const canonicalUrl = withLanguageUrl(`${SITE_URL}/desktop/${category}`, language);
 const title = `${seoCopy.title} | PhWalls`;
 const description = seoCopy.description;
 return {
  title,
  description,
  alternates: {
   canonical: canonicalUrl,
   languages: buildLanguageAlternates(`${SITE_URL}/desktop/${category}`),
  },
  openGraph: { title, description, url: canonicalUrl, type: "website", locale: getOpenGraphLocaleForLanguage(language) },
  twitter: { card: "summary_large_image", title, description },
 };
}


export default async function DesktopCategoryPage({ params }: DesktopCategoryPageProps) {
 const { category } = await params;
 if (!isDesktopWallpaperCategory(category)) notFound();
 const label = getDesktopWallpaperCategoryLabel(category);
 const collections = sortByDateDesc(await loadDesktopWallpaperCollections(category));
 const cards = collections.map((c) => ({
  name: c.name,
  date: c.date,
  count: c.item?.length || 0,
  imageKey: c.item?.[0]?.compressPath || c.item?.[0]?.originPath || null,
  wallpapers: c.item || [],
 }));
 const language = await resolveMetadataLanguage();
 const seoCopy = getDesktopCategorySeoCopy(language, label, cards.length);
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
   cardAspect="aspect-video"
   gridClass="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
   cards={cards}
   navigationTabs={getDesktopTabData()}
   categoryPagePrefix="/desktop"
  />
 );
}
