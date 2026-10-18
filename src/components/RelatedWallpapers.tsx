import Link from 'next/link';
import type { Language } from '@/types';
import type { WallpaperCollection } from '@/lib/wallpaper-data';
import { loadRelatedCollections } from '@/lib/wallpaper-discovery-db';
import { collectionDetailPath } from '@/lib/wallpaper-discovery';
import { fillDiscovery, getDiscoveryTexts } from '@/lib/discovery-i18n';
import { getI18nTexts } from '@/lib/i18n';
import { withLanguagePath } from '@/lib/language';

export default async function RelatedWallpapers({ category, collection, language, brandPath, brandLabel }: {
  category: string; collection: WallpaperCollection; language: Language; brandPath: string; brandLabel: string;
}) {
  const rows = await loadRelatedCollections(category, collection, language);
  if (!rows.length) return null;
  const texts = getDiscoveryTexts(language);
  return <section className="mt-12" aria-labelledby="related-wallpapers-title">
    <h2 id="related-wallpapers-title" className="text-lg font-semibold tracking-tight text-gray-900 sm:text-xl">
      {collection.mediaType === 'dynamic' ? texts.relatedLive : texts.related}
    </h2>
    <ul className="mt-5 grid grid-cols-2 gap-x-5 gap-y-2 lg:grid-cols-3">
      {rows.map(row => <li key={row.deviceId}>
        <Link prefetch={false} href={withLanguagePath(collectionDetailPath(category, row.slug, collection.mediaType), language)}
          className="block rounded-lg py-3 pr-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
          <span className="text-sm font-medium text-gray-900 hover:text-blue-600">{row.name}</span>
          <span className="mt-1 block text-xs leading-5 text-gray-500">
            {row.count} {getI18nTexts(language).wallpapers}
            {row.resolutions.length === 1 ? ` · ${row.resolutions[0].replace('x', ' × ')}` : ''}
          </span>
        </Link>
      </li>)}
    </ul>
    <Link href={withLanguagePath(brandPath, language)} className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-blue-700 hover:underline">
      {fillDiscovery(texts.browse, { brand: brandLabel })}<span aria-hidden="true" className="ml-2">→</span>
    </Link>
  </section>;
}
