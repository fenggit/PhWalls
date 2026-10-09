import DesktopWallpaperDetailPage, { generateMetadata as generateDesktopMetadata } from '@/components/DesktopWallpaperDetailPage';

export const runtime = 'edge';

type Props = { params: Promise<{ category: string; slug: string }> };

export function generateMetadata(props: Props) {
  return generateDesktopMetadata({ ...props, mediaType: 'dynamic' });
}

export default function DesktopLiveWallpaperDetailPage(props: Props) {
  return DesktopWallpaperDetailPage({ ...props, mediaType: 'dynamic' });
}
