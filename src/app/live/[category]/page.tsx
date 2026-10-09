import { notFound, permanentRedirect } from 'next/navigation';
import { isLiveWallpaperCategory } from '@/lib/live-data';
import { withLanguagePath } from '@/lib/language';
import { buildLiveCategoryPath } from '@/lib/live-paths';
import { resolveMetadataLanguage } from '@/lib/metadata';

export const runtime = 'edge';

export default async function LegacyLiveCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!isLiveWallpaperCategory(category)) notFound();
  permanentRedirect(withLanguagePath(buildLiveCategoryPath(category), await resolveMetadataLanguage()));
}
