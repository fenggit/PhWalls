'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

type BackNavButtonProps = {
  homeHref: string;
  label: string;
  variant?: 'light' | 'dark';
  iconOnly?: boolean;
  className?: string;
};

export default function BackNavButton({
  homeHref,
  label,
  variant = 'dark',
  iconOnly = true,
  className = '',
}: BackNavButtonProps) {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(homeHref);
  }, [homeHref, router]);

  const variantClass =
    variant === 'light'
      ? 'text-white hover:text-white/90 hover:bg-white/10'
      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50';

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label={label}
      title={label}
      className={`inline-flex items-center justify-center text-sm font-medium transition-all duration-200 ${iconOnly ? 'h-9 w-9 rounded-lg' : 'gap-2 rounded-full px-3 py-2'} ${variantClass} ${className}`}
    >
      <ChevronLeft className="h-4 w-4" />
      {!iconOnly && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
