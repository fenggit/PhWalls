import type { Language } from '@/types';

export const MAX_SHARE_CARD_IMAGES = 6;
const STATIC_SHARE_CDN_HOST = 'static.phwalls.com';

export interface ShareCardPayload {
  title: string;
  url: string;
  brand?: string;
  images?: string[];
}

export interface ShareTexts {
  share: string;
  shareDescription: string;
  saveCard: string;
  copyLink: string;
  copiedLink: string;
  nativeShare: string;
  shareCardBrandLine: string;
  scanToView: string;
  wallpaperGallery: string;
  officialCollection: string;
}

export function buildShareImageUrl(input: string): string {
  const value = String(input || '').trim();

  if (!value) {
    return '';
  }

  const key = extractShareObjectKey(value);
  if (key) {
    return `/api/public/share-image?key=${encodeURIComponent(key)}`;
  }

  if (value.startsWith('/') || /^https?:\/\//i.test(value) || value.startsWith('data:')) {
    return value;
  }

  return `/api/public/share-image?key=${encodeURIComponent(value)}`;
}

function decodeObjectKeyFromPathname(pathname: string): string {
  return pathname
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join('/');
}

export function extractShareObjectKey(input: string): string | null {
  const value = String(input || '').trim();
  if (!value) return null;

  if (!value.startsWith('/') && !/^https?:\/\//i.test(value)) {
    return value;
  }

  try {
    const url = value.startsWith('http')
      ? new URL(value)
      : new URL(value, 'https://www.phwalls.com');

    if (url.pathname === '/api/public/wallpaper-image' || url.pathname === '/api/public/share-image') {
      const key = url.searchParams.get('key');
      return key ? decodeURIComponent(key) : null;
    }

    if (url.hostname === STATIC_SHARE_CDN_HOST) {
      return decodeObjectKeyFromPathname(url.pathname);
    }
  } catch {
    return null;
  }

  return null;
}

export function normalizeShareImages(images?: string[]): string[] {
  return Array.from(
    new Set(
      (images || [])
        .map((image) => String(image || '').trim())
        .filter(Boolean)
    )
  ).slice(0, MAX_SHARE_CARD_IMAGES);
}

export function getShareTexts(language: Language): ShareTexts {
  switch (language) {
    case 'zh':
      return {
        share: '分享',
        shareDescription: '分享当前页面，并保存带壁纸预览的分享卡片。',
        saveCard: '保存',
        copyLink: '复制',
        copiedLink: '已复制链接',
        nativeShare: '分享',
        shareCardBrandLine: '手机与桌面系统官方壁纸精选',
        scanToView: '扫码查看',
        wallpaperGallery: '壁纸精选',
        officialCollection: 'phwalls.com',
      };
    case 'ja':
      return {
        share: '共有',
        shareDescription: '現在のページを共有し、壁紙プレビュー付きカードを保存できます。',
        saveCard: '保存',
        copyLink: 'コピー',
        copiedLink: 'リンクをコピーしました',
        nativeShare: '共有',
        shareCardBrandLine: 'スマホとデスクトップの公式壁紙コレクション',
        scanToView: 'スキャンして表示',
        wallpaperGallery: '壁紙ギャラリー',
        officialCollection: 'phwalls.com',
      };
    case 'vi':
      return {
        share: 'Chia se',
        shareDescription: 'Chia se trang hien tai va luu the chia se kem xem truoc hinh nen.',
        saveCard: 'Luu',
        copyLink: 'Sao chep',
        copiedLink: 'Da sao chep lien ket',
        nativeShare: 'Chia se',
        shareCardBrandLine: 'Bo suu tap hinh nen chinh thuc cho dien thoai va desktop',
        scanToView: 'Quet ma de xem',
        wallpaperGallery: 'Bo suu tap hinh nen',
        officialCollection: 'phwalls.com',
      };
    case 'zh-hant':
      return {
        share: '分享',
        shareDescription: '分享目前頁面，並儲存附帶壁紙預覽的分享卡片。',
        saveCard: '儲存',
        copyLink: '複製',
        copiedLink: '已複製連結',
        nativeShare: '分享',
        shareCardBrandLine: '手機與桌面系統官方壁紙精選',
        scanToView: '掃碼查看',
        wallpaperGallery: '壁紙精選',
        officialCollection: 'phwalls.com',
      };
    case 'en':
    default:
      return {
        share: 'Share',
        shareDescription: 'Share this page and save a branded card with wallpaper previews.',
        saveCard: 'Save',
        copyLink: 'Copy',
        copiedLink: 'Copied Link',
        nativeShare: 'Share',
        shareCardBrandLine: 'Official phone and desktop wallpaper collection',
        scanToView: 'Scan To View',
        wallpaperGallery: 'Wallpaper Gallery',
        officialCollection: 'phwalls.com',
      };
  }
}
