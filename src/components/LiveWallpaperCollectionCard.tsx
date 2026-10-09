'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Images } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import WallpaperPlayIndicator from '@/components/WallpaperPlayIndicator';

type Props = {
  href: string;
  title: string;
  date: string;
  count: number;
  imageUrl?: string | null;
  headingLevel?: 'h2' | 'h3';
  eager?: boolean;
  priority?: boolean;
  onImageLoad?: () => void;
};

export default function LiveWallpaperCollectionCard({
  href, title, date, count, imageUrl, headingLevel = 'h2', eager = false, priority = false, onImageLoad,
}: Props) {
  const { texts } = useLanguage();
  const [imageError, setImageError] = useState(false);
  useEffect(() => setImageError(false), [imageUrl]);
  const Heading = headingLevel;

  return (
    <article className="group w-full">
      <Link href={href} prefetch={false} aria-label={`${title} ${texts.preview}`}
        className="block w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
        <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none">
          <div className="aspect-[9/16] overflow-hidden bg-gray-100">
            {imageUrl && !imageError ? (
              <img src={imageUrl} alt={`${title} ${texts.preview}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
                loading={eager ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'low'} decoding="async"
                onLoad={onImageLoad}
                onError={() => { setImageError(true); onImageLoad?.(); }} />
            ) : imageError ? (
              <p className="flex h-full items-end justify-center px-3 pb-16 text-center text-xs text-gray-500">{texts.imageLoadFailed}</p>
            ) : null}
          </div>
          <WallpaperPlayIndicator />
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-xl bg-black/45 px-2 py-0.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md">
            <Images className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{count}<span className="sr-only"> {texts.wallpapers}</span></span>
          </span>
        </div>
      </Link>
      <div className="mt-3">
        <Heading className="text-sm font-semibold leading-tight text-gray-900">
          <Link href={href} prefetch={false} className="rounded-sm hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
            {title}
          </Link>
        </Heading>
      </div>
      {date && <p className="mt-1 text-xs text-gray-500">{date} {texts.updatedLabel}</p>}
    </article>
  );
}
