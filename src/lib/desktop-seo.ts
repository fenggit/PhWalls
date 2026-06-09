import { LanguageCode, type Language } from '@/types';
import { formatWallpaperDisplayName } from '@/lib/data';

type DesktopHomeSeoCopy = {
  title: string;
  description: string;
};

type DesktopDetailSeoCopyInput = {
  collectionName: string;
  categoryLabel: string;
  count: number;
};

type DesktopDetailSeoCopy = {
  title: string;
  description: string;
  summaryTitle: string;
  summaryDescription: string;
  galleryName: string;
  galleryDescription: string;
  categoryLabel: string;
};

const desktopHomeSeoByLanguage: Record<Language, DesktopHomeSeoCopy> = {
  [LanguageCode.EN]: {
    title: 'Desktop Wallpapers',
    description:
      'Download official desktop wallpapers from Windows, Ubuntu, ChromeOS, Microsoft Surface, and other built-in PC wallpaper collections.',
  },
  [LanguageCode.ZH]: {
    title: '电脑桌面壁纸',
    description:
      '下载 Windows、Ubuntu、ChromeOS、Microsoft Surface 等系统与 PC 设备内置官方桌面壁纸，支持高清原图预览与免费下载。',
  },
  [LanguageCode.ZH_HANT]: {
    title: '電腦桌面桌布',
    description:
      '下載 Windows、Ubuntu、ChromeOS、Microsoft Surface 等系統與 PC 裝置內建官方桌面桌布，支援高清原圖預覽與免費下載。',
  },
  [LanguageCode.JA]: {
    title: 'デスクトップ壁紙',
    description:
      'Windows、Ubuntu、ChromeOS、Microsoft Surface など、PC に内蔵された公式デスクトップ壁紙を高解像度でプレビュー、無料ダウンロードできます。',
  },
  [LanguageCode.VI]: {
    title: 'Hình nền desktop',
    description:
      'Tải hình nền desktop chính thức từ Windows, Ubuntu, ChromeOS, Microsoft Surface và các bộ hình nền PC tích hợp sẵn, hỗ trợ xem trước và tải miễn phí.',
  },
};

export function getDesktopHomeSeoCopy(language: Language): DesktopHomeSeoCopy {
  return desktopHomeSeoByLanguage[language] || desktopHomeSeoByLanguage[LanguageCode.EN];
}

export function getDesktopCategoryLabel(language: Language): string {
  switch (language) {
    case LanguageCode.ZH:
      return '桌面壁纸';
    case LanguageCode.ZH_HANT:
      return '桌面桌布';
    case LanguageCode.JA:
      return 'デスクトップ壁紙';
    case LanguageCode.VI:
      return 'Hình nền desktop';
    case LanguageCode.EN:
    default:
      return 'Desktop Wallpapers';
  }
}

export function buildDesktopDetailSeoCopy(
  language: Language,
  input: DesktopDetailSeoCopyInput
): DesktopDetailSeoCopy {
  const collectionName = formatWallpaperDisplayName(input.collectionName);
  const categoryLabel = formatWallpaperDisplayName(input.categoryLabel);
  const desktopCategoryLabel = getDesktopCategoryLabel(language);

  switch (language) {
    case LanguageCode.ZH:
      return {
        title: `${collectionName} 高清桌面壁纸免费下载 | PhWalls`,
        description: `下载 ${collectionName} 官方桌面壁纸，来自 ${categoryLabel}，共 ${input.count} 张。支持高清原图预览、无水印、免费下载。`,
        summaryTitle: `${collectionName} 桌面壁纸合集`,
        summaryDescription: `本合集收录 ${input.count} 张来自 ${categoryLabel} 的官方桌面壁纸，整理自系统与 PC 内置壁纸资源，支持预览与下载。`,
        galleryName: `${collectionName} ${desktopCategoryLabel}`,
        galleryDescription: `${input.count} 张来自 ${categoryLabel} 的官方桌面壁纸。`,
        categoryLabel: desktopCategoryLabel,
      };
    case LanguageCode.ZH_HANT:
      return {
        title: `${collectionName} 高清桌面桌布免費下載 | PhWalls`,
        description: `下載 ${collectionName} 官方桌面桌布，來自 ${categoryLabel}，共 ${input.count} 張。支援高清原圖預覽、無浮水印、免費下載。`,
        summaryTitle: `${collectionName} 桌面桌布合集`,
        summaryDescription: `本合集收錄 ${input.count} 張來自 ${categoryLabel} 的官方桌面桌布，整理自系統與 PC 內建桌布資源，支援預覽與下載。`,
        galleryName: `${collectionName} ${desktopCategoryLabel}`,
        galleryDescription: `${input.count} 張來自 ${categoryLabel} 的官方桌面桌布。`,
        categoryLabel: desktopCategoryLabel,
      };
    case LanguageCode.JA:
      return {
        title: `${collectionName} デスクトップ壁紙を無料ダウンロード | PhWalls`,
        description: `${categoryLabel} の公式デスクトップ壁紙「${collectionName}」を ${input.count} 枚収録。高解像度プレビュー、透かしなし、無料ダウンロードに対応しています。`,
        summaryTitle: `${collectionName} デスクトップ壁紙コレクション`,
        summaryDescription: `${categoryLabel} から収録した公式デスクトップ壁紙 ${input.count} 枚を、内蔵壁紙アーカイブとしてプレビュー、ダウンロードできます。`,
        galleryName: `${collectionName} ${desktopCategoryLabel}`,
        galleryDescription: `${categoryLabel} の公式デスクトップ壁紙 ${input.count} 枚。`,
        categoryLabel: desktopCategoryLabel,
      };
    case LanguageCode.VI:
      return {
        title: `Tải miễn phí ${collectionName} cho desktop | PhWalls`,
        description: `Tải ${input.count} hình nền desktop chính thức của ${collectionName} từ ${categoryLabel}. Xem trước ảnh độ phân giải cao, không watermark và tải miễn phí.`,
        summaryTitle: `Bộ hình nền desktop ${collectionName}`,
        summaryDescription: `Bộ sưu tập này gồm ${input.count} hình nền desktop chính thức từ ${categoryLabel}, được sắp xếp từ kho hình nền tích hợp sẵn để xem trước và tải xuống.`,
        galleryName: `${collectionName} ${desktopCategoryLabel}`,
        galleryDescription: `${input.count} hình nền desktop chính thức từ ${categoryLabel}.`,
        categoryLabel: desktopCategoryLabel,
      };
    case LanguageCode.EN:
    default:
      return {
        title: `${collectionName} Desktop Wallpapers in 4K HD | PhWalls`,
        description: `Download official ${collectionName} desktop wallpapers from ${categoryLabel}. Full resolution, watermark-free, and free to preview.`,
        summaryTitle: `${collectionName} Desktop Wallpapers`,
        summaryDescription: `This collection includes ${input.count} official desktop wallpapers from ${categoryLabel}. Images are organized from the built-in wallpaper archive for preview and download.`,
        galleryName: `${collectionName} Desktop Wallpapers`,
        galleryDescription: `${input.count} official desktop wallpapers from ${categoryLabel}.`,
        categoryLabel: desktopCategoryLabel,
      };
  }
}
