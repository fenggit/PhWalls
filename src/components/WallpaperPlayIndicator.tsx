import { Play } from 'lucide-react';

export default function WallpaperPlayIndicator() {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-gray-900 shadow-sm backdrop-blur transition-[transform,background-color] duration-200 group-hover:scale-105 group-hover:bg-white/90 motion-reduce:transform-none motion-reduce:transition-none">
        <Play strokeWidth={2.2} className="h-[18px] w-[18px] translate-x-0.5 fill-current" />
      </span>
    </span>
  );
}
