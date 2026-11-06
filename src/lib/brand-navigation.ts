import { normalizeCategoryType } from '@/lib/brands';

// 前台导航与后台品牌选择共用的手机品牌顺序；未列出的品牌排在末尾。
export const PHONE_NAVIGATION_ORDER = [
  'samsung',
  'xiaomi',
  'huawei',
  'oppo',
  'vivo',
  'google-pixel',
  'honor',
  'oneplus',
  'google',
  'motorola',
  'sony',
  'nothing',
  'realme',
  'redmi',
  'poco',
  'iqoo',
  'asus-rog-phone',
  'transsion-infinix',
  'transsion-tecno',
  'nokia',
  'black-shark',
  'fairphone',
  'hmd',
  'htc',
  'lg',
  'lava',
  'lenovo',
  'meizu',
  'micromax',
  'nio',
  'nubia',
  'redmagic',
  'sharp',
  'zte',
  'android',
] as const;

export const POPULAR_PHONE_TYPES: ReadonlySet<string> = new Set(PHONE_NAVIGATION_ORDER.slice(0, 8));

export const BRAND_ICON_PATHS: Record<string, string> = {
  apple: '/brand-icons/apple.svg',
  iphone: '/brand-icons/apple.svg',
  macos: '/brand-icons/apple.svg',
  poco: '/brand-icons/poco.svg',
  'transsion-tecno': '/brand-icons/transsion-tecno.svg',
  harmonyos: '/brand-icons/harmonyos.svg',
  samsung: '/brand-icons/samsung.svg',
  smartisan: '/brand-icons/smartisan.svg',
  xiaomi: '/brand-icons/xiaomi.svg',
  huawei: '/brand-icons/huawei.svg',
  oppo: '/brand-icons/oppo.svg',
  vivo: '/brand-icons/vivo.svg',
  'google-pixel': '/brand-icons/google-pixel.svg',
  google: '/brand-icons/google.svg',
  honor: '/brand-icons/honor.svg',
  oneplus: '/brand-icons/oneplus.svg',
  motorola: '/brand-icons/motorola.svg',
  sony: '/brand-icons/sony.svg',
  nothing: '/brand-icons/nothing.svg',
  realme: '/brand-icons/realme.svg',
  redmi: '/brand-icons/xiaomi.svg',
  iqoo: '/brand-icons/iqoo.svg',
  'asus-rog-phone': '/brand-icons/asus-rog-phone.svg',
  'transsion-infinix': '/brand-icons/transsion-infinix.svg',
  nokia: '/brand-icons/nokia.svg',
  'black-shark': '/brand-icons/black-shark.svg',
  fairphone: '/brand-icons/fairphone.svg',
  hmd: '/brand-icons/hmd.svg',
  htc: '/brand-icons/htc.svg',
  lg: '/brand-icons/lg.svg',
  lava: '/brand-icons/lava.svg',
  lenovo: '/brand-icons/lenovo.svg',
  meizu: '/brand-icons/meizu.svg',
  micromax: '/brand-icons/micromax.svg',
  nio: '/brand-icons/nio.svg',
  nubia: '/brand-icons/nubia.svg',
  redmagic: '/brand-icons/redmagic.svg',
  sharp: '/brand-icons/sharp.svg',
  zte: '/brand-icons/zte.svg',
  android: '/brand-icons/android.svg',
  'microsoft-windows': '/brand-icons/microsoft.svg',
  'microsoft-design': '/brand-icons/microsoft.svg',
  'microsoft-surface': '/brand-icons/microsoft.svg',
  ubuntu: '/brand-icons/ubuntu.svg',
  'omarchy-linux': '/brand-icons/omarchy-linux.svg',
  'google-chromeos': '/brand-icons/google-chromeos.svg',
  'google-os': '/brand-icons/google-os.svg',
};

export const BRAND_ICON_VERSION = '20260921-1';

const WORDMARK_TYPES = new Set([
  'samsung', 'sony', 'oppo', 'vivo', 'honor', 'nokia', 'iqoo',
  'transsion-infinix', 'transsion-tecno', 'poco', 'nothing', 'realme',
  'fairphone', 'hmd', 'htc', 'lg', 'lava', 'lenovo', 'nubia', 'sharp', 'zte',
]);

export function getBrandIcon(type: string): { src: string; wordmark: boolean } | null {
  const normalized = normalizeCategoryType(type);
  const path = BRAND_ICON_PATHS[normalized];
  return path ? { src: `${path}?v=${BRAND_ICON_VERSION}`, wordmark: WORDMARK_TYPES.has(normalized) } : null;
}
