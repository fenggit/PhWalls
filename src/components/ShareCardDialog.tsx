'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toBlob } from 'html-to-image';
import QRCode from 'qrcode';
import { Download, Link2, Share2, X } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import {
  buildShareImageUrl,
  getShareTexts,
  normalizeShareImages,
  type ShareCardPayload,
} from '@/lib/share';

interface ShareCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  payload: ShareCardPayload | null;
}

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function waitForImageReady(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) {
    if (typeof image.decode === 'function') {
      try {
        await image.decode();
      } catch {
        // Ignore decode failures and let export continue with the loaded image.
      }
    }
    return;
  }

  await new Promise<void>((resolve) => {
    const handleDone = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      image.removeEventListener('load', handleDone);
      image.removeEventListener('error', handleDone);
    };

    image.addEventListener('load', handleDone, { once: true });
    image.addEventListener('error', handleDone, { once: true });
  });

  if (typeof image.decode === 'function') {
    try {
      await image.decode();
    } catch {
      // Some browsers may reject decode() even after load; safe to continue.
    }
  }
}

async function waitForShareCardReady(element: HTMLElement): Promise<void> {
  await waitForNextFrame();
  await waitForNextFrame();

  const fontsReady =
    typeof document !== 'undefined' && 'fonts' in document
      ? (document.fonts.ready as Promise<unknown>).catch(() => undefined)
      : Promise.resolve();

  const imageReady = Promise.all(
    Array.from(element.querySelectorAll('img')).map((image) => waitForImageReady(image))
  );

  await Promise.all([fontsReady, imageReady]);
  await waitForNextFrame();
}

function getShareSummaryLines(title: string, language: string): string[] {
  if (language === 'zh' || language === 'zh-hant') {
    return [
      `${title} 高清官方壁纸合集`,
      '支持下载无水印原图',
      '覆盖手机与桌面系统官方壁纸',
    ];
  }

  if (language === 'ja') {
    return [
      `${title} の高画質公式壁紙コレクション`,
      '透かしなしのオリジナル画像を保存可能',
      'スマホとデスクトップ向けの壁紙を収録',
    ];
  }

  if (language === 'vi') {
    return [
      `Bo suu tap hinh nen chinh thuc chat luong cao cho ${title}`,
      'Tai anh goc khong watermark',
      'Tong hop hinh nen cho dien thoai va desktop',
    ];
  }

  return [
    `High-resolution official wallpapers for ${title}`,
    'Save original images with no watermark',
    'Curated for phone and desktop wallpaper fans',
  ];
}

export default function ShareCardDialog({ isOpen, onClose, payload }: ShareCardDialogProps) {
  const { texts, language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [shareError, setShareError] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shareCardRef = useRef<HTMLDivElement | null>(null);

  const shareTexts = useMemo(() => getShareTexts(language), [language]);
  const saveLabel = shareTexts.saveCard;
  const copyLinkLabel = copied ? shareTexts.copiedLink : shareTexts.copyLink;
  const nativeShareLabel = shareTexts.nativeShare;

  const brandLabel = payload?.brand || texts.siteName;
  const gridImages = useMemo(
    () => normalizeShareImages(payload?.images).map((image) => buildShareImageUrl(image)).filter(Boolean),
    [payload?.images]
  );
  const summaryLines = useMemo(
    () => getShareSummaryLines(payload?.title || brandLabel, language),
    [brandLabel, language, payload?.title]
  );

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setSaveError('');
      setShareError('');
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || gridImages.length === 0) return;

    gridImages.forEach((source) => {
      const image = new Image();
      image.decoding = 'async';
      image.crossOrigin = 'anonymous';
      image.src = source;
    });
  }, [gridImages, isOpen]);

  useEffect(() => {
    let active = true;

    const generateQrCode = async () => {
      if (!payload?.url) {
        setQrCodeDataUrl('');
        return;
      }

      try {
        const dataUrl = await QRCode.toDataURL(payload.url, {
          errorCorrectionLevel: 'M',
          margin: 1,
          color: {
            dark: '#111111',
            light: '#ffffff',
          },
          width: 240,
        });

        if (active) {
          setQrCodeDataUrl(dataUrl);
        }
      } catch {
        if (active) {
          setQrCodeDataUrl('');
        }
      }
    };

    void generateQrCode();

    return () => {
      active = false;
    };
  }, [payload?.url]);

  const handleCopyLink = useCallback(async () => {
    if (!payload?.url) return;

    try {
      await navigator.clipboard.writeText(payload.url);
      setCopied(true);
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      setShareError(texts.copyFailed);
    }
  }, [payload?.url, texts.copyFailed]);

  const handleNativeShare = useCallback(async () => {
    if (!payload?.url || !navigator.share) return;

    setIsSharing(true);
    setShareError('');

    try {
      await navigator.share({
        title: payload.title,
        text: payload.title,
        url: payload.url,
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setShareError(texts.networkErrorRetry);
      }
    } finally {
      setIsSharing(false);
    }
  }, [payload, texts.networkErrorRetry]);

  const handleSaveCard = useCallback(async () => {
    if (!payload || !shareCardRef.current) return;

    setIsSaving(true);
    setSaveError('');

    try {
      await waitForShareCardReady(shareCardRef.current);

      const blob = await toBlob(shareCardRef.current, {
        cacheBust: true,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
      });

      if (!blob) {
        throw new Error('Failed to export share card.');
      }

      const fileName = 'phwalls.com';
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = `${fileName}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setSaveError(texts.downloadFailed);
    } finally {
      setIsSaving(false);
    }
  }, [payload, texts.downloadFailed]);

  if (!isOpen || !payload) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0"
        aria-label={texts.close}
      />

      <div
        className="relative z-[111] flex max-h-[calc(100vh-2rem)] w-full max-w-[980px] flex-col overflow-hidden rounded-[28px] border border-white/30 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-[112] inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900"
          aria-label={texts.close}
        >
          <X className="h-4 w-4" />
        </button>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="grid h-full min-h-0 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="h-full overflow-y-auto bg-[#f3f4f6] px-4 py-4 pb-28 sm:px-6 sm:pb-32 lg:flex lg:items-center lg:justify-center lg:px-10 lg:py-8">
              <div className="mx-auto flex min-h-full max-w-[500px] items-start justify-center lg:mx-0 lg:min-h-0">
                <div
                  ref={shareCardRef}
                  className="w-full max-w-[400px] shrink-0 rounded-[32px] bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-5"
                >
                  <h3 className="text-[2rem] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[2.05rem]">
                    {payload.title}
                  </h3>

                  <p className="mt-1 text-sm font-semibold text-blue-600">{shareTexts.officialCollection}</p>

                  <div className="mt-4 grid grid-cols-3 gap-2.5">
                    {gridImages.length > 0 ? (
                      gridImages.map((image, index) => (
                        <div
                          key={`${image}-${index}`}
                          className="aspect-square overflow-hidden rounded-[20px] border border-slate-200 bg-slate-100"
                        >
                          <img
                            src={image}
                            alt={`${payload.title} wallpaper ${index + 1}`}
                            className="h-full w-full object-cover"
                            loading={index < 3 ? 'eager' : 'lazy'}
                            crossOrigin="anonymous"
                          />
                        </div>
                      ))
                    ) : (
                      <div className="col-span-3 flex aspect-square items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50">
                        <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-gradient-to-br from-blue-600 to-cyan-500 text-2xl font-bold text-white">
                          PH
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-[24px] bg-slate-50 px-4 py-4 sm:px-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {shareTexts.wallpaperGallery}
                    </p>
                    <div className="mt-3 space-y-2.5">
                      {summaryLines.map((line) => (
                        <div key={line} className="flex items-start gap-2.5 text-sm font-medium leading-6 text-slate-700 sm:text-[15px]">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500" />
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 border-t border-slate-200 pt-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-slate-200 bg-white p-2 shadow-sm">
                        {qrCodeDataUrl ? (
                          <img src={qrCodeDataUrl} alt="QR code" className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-900 text-xl font-bold text-white">
                            PH
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-2xl font-extrabold leading-tight text-slate-900">{shareTexts.scanToView}</p>
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{shareTexts.shareCardBrandLine}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden border-l border-slate-200/80 bg-white/95 p-5 lg:flex lg:flex-col lg:justify-center">
              <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{shareTexts.share}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{shareTexts.shareDescription}</p>

                <div className="mt-5 space-y-3">
                  {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
                    <button
                      type="button"
                      onClick={handleNativeShare}
                      disabled={isSharing}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Share2 className="h-4 w-4" />
                      {isSharing ? texts.loading : nativeShareLabel}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleSaveCard}
                    disabled={isSaving}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {isSaving ? texts.downloading : saveLabel}
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <Link2 className="h-4 w-4" />
                    {copyLinkLabel}
                  </button>

                  {saveError ? (
                    <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{saveError}</p>
                  ) : null}

                  {shareError ? (
                    <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">{shareError}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200/80 bg-white/95 px-3 py-3 backdrop-blur-md sm:px-4 lg:hidden">
          <div className="mx-auto max-w-5xl">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  disabled={isSharing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Share2 className="h-4 w-4" />
                  {isSharing ? texts.loading : nativeShareLabel}
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleSaveCard}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {isSaving ? texts.downloading : saveLabel}
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Link2 className="h-4 w-4" />
                {copyLinkLabel}
              </button>
            </div>

            {saveError ? (
              <p className="mt-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{saveError}</p>
            ) : null}

            {shareError ? (
              <p className="mt-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-700">{shareError}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
