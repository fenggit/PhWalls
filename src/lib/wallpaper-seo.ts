import { formatWallpaperDisplayName } from '@/lib/data';
import { LanguageCode, type Language } from '@/types';

export type WallpaperDeviceGroup =
  | 'phone'
  | 'watch'
  | 'mac'
  | 'ipad'
  | 'ipad-landscape'
  | 'ipad-portrait';

type WallpaperDetailSeoCopyInput = {
  collectionName: string;
  categoryLabel: string;
  count: number;
  formats: string[];
  variantLabels: string[];
};

type WallpaperDetailSeoCopy = {
  seoName: string;
  title: string;
  description: string;
  summaryTitle: string;
  summaryDescription: string;
  galleryName: string;
  galleryDescription: string;
  breadcrumbHome: string;
  breadcrumbCategory: string;
  labels: {
    collection: string;
    brand: string;
    files: string;
    updated: string;
    recentlyUpdated: string;
    wallpaperCount: string;
  };
};

const SEO_VARIANT_RULES: Array<{ token: string; label: string }> = [
  { token: 'pro', label: 'Pro' },
  { token: 'ultra', label: 'Ultra' },
  { token: 'plus', label: 'Plus' },
  { token: 'max', label: 'Max' },
  { token: 'fe', label: 'FE' },
  { token: 'fold', label: 'Fold' },
  { token: 'flip', label: 'Flip' },
  { token: 'lite', label: 'Lite' },
  { token: 'se', label: 'SE' },
];

function containsToken(source: string, token: string): boolean {
  const normalizedSource = source.replace(/\(\+\)|\+/g, ' plus ');
  return new RegExp(`(?:^|[^a-z0-9])${token}(?:$|[^a-z0-9])`, 'i').test(normalizedSource);
}

export function collectWallpaperVariantLabels(
  collectionName: string,
  itemNames: string[]
): string[] {
  const source = `${collectionName} ${itemNames.join(' ')}`;

  return SEO_VARIANT_RULES
    .filter(
      ({ token }) => containsToken(source, token) && !containsToken(collectionName, token)
    )
    .map(({ label }) => label)
    .slice(0, 2);
}

function buildSeoName(collectionName: string, variantLabels: string[]): string {
  const cleanName = formatWallpaperDisplayName(collectionName)
    .replace(/\(\+\)|\+/g, ' Plus ')
    .replace(/\s+wallpapers$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return variantLabels.length > 0 ? `${cleanName} ${variantLabels.join(' ')}` : cleanName;
}

const ENGLISH_TITLE_EXPERIMENTS = new Set([
  'Infinix Note 60',
  'Samsung Galaxy A17 5G',
]);

function buildEnglishTitle(
  input: WallpaperDetailSeoCopyInput,
  seoName: string,
  formatText: string
): string {
  if (!ENGLISH_TITLE_EXPERIMENTS.has(input.collectionName)) {
    return `${seoName} Stock Wallpapers in 4K HD | PhWalls`;
  }

  const formatLabel = formatText || 'HD';
  const imageLabel = input.count === 1 ? 'Image' : 'Images';
  return `${seoName} Wallpaper - ${input.count} Original ${formatLabel} ${imageLabel} | PhWalls`;
}

function buildFormatText(formats: string[]): string {
  return formats.length > 0 ? formats.join(' / ') : '';
}

export function buildWallpaperDetailSeoCopy(
  language: Language,
  input: WallpaperDetailSeoCopyInput
): WallpaperDetailSeoCopy {
  const seoName = buildSeoName(input.collectionName, input.variantLabels);
  const formatText = buildFormatText(input.formats);

  switch (language) {
    case LanguageCode.ZH:
      return {
        seoName,
        title: `${seoName} 官方内置壁纸高清原图下载 | PhWalls`,
        description: `免费下载 ${input.count} 张 ${seoName} 官方内置壁纸，支持 4K/HD 高清预览、无水印原图下载${formatText ? `，提供 ${formatText} 格式` : ''}。`,
        summaryTitle: `${seoName} 官方内置壁纸合集`,
        summaryDescription: `本页收录 ${input.count} 张来自 ${input.categoryLabel} 的 ${seoName} 官方内置壁纸，支持高清预览与无水印原图免费下载${formatText ? `，文件格式为 ${formatText}` : ''}。`,
        galleryName: `${seoName} 官方内置壁纸`,
        galleryDescription: `${input.count} 张来自 ${input.categoryLabel} 的 ${seoName} 官方内置高清壁纸。`,
        breadcrumbHome: '首页',
        breadcrumbCategory: `${input.categoryLabel} 壁纸`,
        labels: {
          collection: '合集',
          brand: '品牌',
          files: '文件',
          updated: '更新',
          recentlyUpdated: '近期更新',
          wallpaperCount: `${input.count} 张壁纸`,
        },
      };
    case LanguageCode.ZH_HANT:
      return {
        seoName,
        title: `${seoName} 官方內建桌布高清原圖下載 | PhWalls`,
        description: `免費下載 ${input.count} 張 ${seoName} 官方內建桌布，支援 4K/HD 高清預覽、無浮水印原圖下載${formatText ? `，提供 ${formatText} 格式` : ''}。`,
        summaryTitle: `${seoName} 官方內建桌布合集`,
        summaryDescription: `本頁收錄 ${input.count} 張來自 ${input.categoryLabel} 的 ${seoName} 官方內建桌布，支援高清預覽與無浮水印原圖免費下載${formatText ? `，檔案格式為 ${formatText}` : ''}。`,
        galleryName: `${seoName} 官方內建桌布`,
        galleryDescription: `${input.count} 張來自 ${input.categoryLabel} 的 ${seoName} 官方內建高清桌布。`,
        breadcrumbHome: '首頁',
        breadcrumbCategory: `${input.categoryLabel} 桌布`,
        labels: {
          collection: '合集',
          brand: '品牌',
          files: '檔案',
          updated: '更新',
          recentlyUpdated: '近期更新',
          wallpaperCount: `${input.count} 張桌布`,
        },
      };
    case LanguageCode.JA:
      return {
        seoName,
        title: `${seoName} 公式壁紙を4K・HDで無料ダウンロード | PhWalls`,
        description: `${seoName} の公式内蔵壁紙 ${input.count} 枚を無料でダウンロード。4K・HD の高解像度プレビュー、透かしなしの原画像${formatText ? `（${formatText}）` : ''}に対応しています。`,
        summaryTitle: `${seoName} 公式内蔵壁紙コレクション`,
        summaryDescription: `${input.categoryLabel} の ${seoName} 公式内蔵壁紙 ${input.count} 枚を収録。高解像度プレビューと、透かしなしの原画像の無料ダウンロードに対応しています${formatText ? `。ファイル形式は ${formatText} です` : ''}。`,
        galleryName: `${seoName} 公式内蔵壁紙`,
        galleryDescription: `${input.categoryLabel} の ${seoName} 公式高解像度壁紙 ${input.count} 枚。`,
        breadcrumbHome: 'ホーム',
        breadcrumbCategory: `${input.categoryLabel} 壁紙`,
        labels: {
          collection: 'コレクション',
          brand: 'ブランド',
          files: 'ファイル',
          updated: '更新日',
          recentlyUpdated: '最近更新',
          wallpaperCount: `${input.count} 枚`,
        },
      };
    case LanguageCode.VI:
      return {
        seoName,
        title: `Tải hình nền gốc ${seoName} 4K HD | PhWalls`,
        description: `Tải miễn phí ${input.count} hình nền tích hợp chính thức của ${seoName}. Xem trước ảnh 4K/HD, tải ảnh gốc không watermark${formatText ? ` ở định dạng ${formatText}` : ''}.`,
        summaryTitle: `Bộ hình nền chính thức của ${seoName}`,
        summaryDescription: `Trang này gồm ${input.count} hình nền tích hợp chính thức của ${seoName} từ ${input.categoryLabel}, hỗ trợ xem trước độ phân giải cao và tải ảnh gốc không watermark${formatText ? ` ở định dạng ${formatText}` : ''}.`,
        galleryName: `Hình nền chính thức của ${seoName}`,
        galleryDescription: `${input.count} hình nền chính thức độ phân giải cao của ${seoName} từ ${input.categoryLabel}.`,
        breadcrumbHome: 'Trang chủ',
        breadcrumbCategory: `Hình nền ${input.categoryLabel}`,
        labels: {
          collection: 'Bộ sưu tập',
          brand: 'Thương hiệu',
          files: 'Tệp',
          updated: 'Cập nhật',
          recentlyUpdated: 'Mới cập nhật',
          wallpaperCount: `${input.count} hình nền`,
        },
      };
    case LanguageCode.EN:
    default:
      return {
        seoName,
        title: buildEnglishTitle(input, seoName, formatText),
        description: `Download ${input.count} official ${seoName} stock wallpapers in 4K/HD. Preview original full-resolution images with no watermark${formatText ? ` in ${formatText}` : ''}.`,
        summaryTitle: `${seoName} Stock Wallpaper Collection`,
        summaryDescription: `Explore ${input.count} official ${seoName} stock wallpapers from ${input.categoryLabel}. Preview high-resolution images and download the watermark-free originals${formatText ? ` in ${formatText}` : ''}.`,
        galleryName: `${seoName} Stock Wallpapers`,
        galleryDescription: `${input.count} official ${seoName} high-resolution wallpapers from ${input.categoryLabel}.`,
        breadcrumbHome: 'Home',
        breadcrumbCategory: `${input.categoryLabel} Wallpapers`,
        labels: {
          collection: 'Collection',
          brand: 'Brand',
          files: 'Files',
          updated: 'Updated',
          recentlyUpdated: 'Recently updated',
          wallpaperCount: `${input.count} wallpapers`,
        },
      };
  }
}

export function getWallpaperDeviceGroupLabel(
  language: Language,
  group: WallpaperDeviceGroup
): string {
  const labels: Record<Language, Record<WallpaperDeviceGroup, string>> = {
    [LanguageCode.EN]: {
      phone: 'Phone',
      watch: 'Watch',
      mac: 'Mac',
      ipad: 'iPad',
      'ipad-landscape': 'iPad (Landscape)',
      'ipad-portrait': 'iPad (Portrait)',
    },
    [LanguageCode.ZH]: {
      phone: '手机',
      watch: '手表',
      mac: 'Mac',
      ipad: 'iPad',
      'ipad-landscape': 'iPad（横屏）',
      'ipad-portrait': 'iPad（竖屏）',
    },
    [LanguageCode.ZH_HANT]: {
      phone: '手機',
      watch: '手錶',
      mac: 'Mac',
      ipad: 'iPad',
      'ipad-landscape': 'iPad（橫向）',
      'ipad-portrait': 'iPad（直向）',
    },
    [LanguageCode.JA]: {
      phone: 'スマートフォン',
      watch: 'ウォッチ',
      mac: 'Mac',
      ipad: 'iPad',
      'ipad-landscape': 'iPad（横向き）',
      'ipad-portrait': 'iPad（縦向き）',
    },
    [LanguageCode.VI]: {
      phone: 'Điện thoại',
      watch: 'Đồng hồ',
      mac: 'Mac',
      ipad: 'iPad',
      'ipad-landscape': 'iPad (ngang)',
      'ipad-portrait': 'iPad (dọc)',
    },
  };

  return labels[language]?.[group] || labels[LanguageCode.EN][group];
}

export function buildWallpaperImageDescription(
  language: Language,
  imageName: string,
  seoName: string,
  categoryLabel: string
): string {
  switch (language) {
    case LanguageCode.ZH:
      return `${imageName} - ${categoryLabel} ${seoName} 官方高清壁纸`;
    case LanguageCode.ZH_HANT:
      return `${imageName} - ${categoryLabel} ${seoName} 官方高清桌布`;
    case LanguageCode.JA:
      return `${imageName} - ${categoryLabel} ${seoName} 公式高解像度壁紙`;
    case LanguageCode.VI:
      return `${imageName} - hình nền chính thức ${seoName} độ phân giải cao của ${categoryLabel}`;
    case LanguageCode.EN:
    default:
      return `${imageName} - official ${seoName} high-resolution wallpaper from ${categoryLabel}`;
  }
}
