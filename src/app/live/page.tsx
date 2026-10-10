import { permanentRedirect } from 'next/navigation';
import { withLanguagePath } from '@/lib/language';
import { LIVE_WALLPAPERS_PATH } from '@/lib/live-paths';
import { resolveMetadataLanguage } from '@/lib/metadata';

export const runtime = 'edge';

export default async function LegacyLivePage() {
  permanentRedirect(withLanguagePath(LIVE_WALLPAPERS_PATH, await resolveMetadataLanguage()));
}
