'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Share2 } from 'lucide-react';
import { useLanguage } from '@/components/LanguageProvider';
import { getShareTexts } from '@/lib/share';

type Props = {
  title: string;
  previewImageUrl?: string;
  shareUrl: string;
  downloadDisabled: boolean;
  isDownloading: boolean;
  onDownload: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClose: () => void;
};

export default function WallpaperActionsSheet({ title, previewImageUrl, shareUrl, downloadDisabled, isDownloading, onDownload, onClose }: Props) {
  const { language, texts } = useLanguage();
  const shareTexts = getShareTexts(language);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sharingRef = useRef(false);
  const [showLink, setShowLink] = useState(false);
  const [shareStatus, setShareStatus] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  const share = async () => {
    if (sharingRef.current) return;
    sharingRef.current = true;
    try {
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share({ title, url: shareUrl });
          onClose();
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
      }
      setShowLink(true);
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareStatus(shareTexts.copiedLink);
      }
    } catch {
      setShareStatus(texts.copyFailed);
    } finally {
      sharingRef.current = false;
    }
  };

  const actionClass = 'group flex min-h-24 flex-col items-center justify-center gap-3 rounded-xl text-sm font-medium text-white/90 transition-colors hover:bg-white/[0.06] active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white/70 disabled:opacity-30 disabled:cursor-not-allowed motion-reduce:transition-none';

  return (
    <dialog ref={dialogRef} aria-labelledby="wallpaper-actions-title"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] top-auto m-0 max-h-[80dvh] w-auto max-w-none overflow-y-auto rounded-3xl border border-white/10 bg-[#202124] p-0 text-white shadow-[0_16px_64px_rgba(0,0,0,0.45)] backdrop:bg-black/35 sm:inset-0 sm:m-auto sm:w-80"
      onCancel={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex items-center gap-3 px-5 pt-5 pb-3">
        {previewImageUrl && <img src={previewImageUrl} alt="" className="h-14 w-10 shrink-0 rounded-lg bg-white/5 object-cover" />}
        <div className="min-w-0">
          <h2 id="wallpaper-actions-title" className="text-[15px] font-semibold leading-6 tracking-wide">{texts.wallpaperActions}</h2>
          <p className="mt-0.5 truncate text-xs leading-5 text-white/50" title={title}>{title}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 pb-3">
        <button type="button" className={actionClass} onClick={() => void share()}>
          <Share2 className="h-6 w-6 text-white/80" strokeWidth={1.6} aria-hidden="true" />{shareTexts.share}
        </button>
        <button type="button" className={actionClass} disabled={downloadDisabled} aria-busy={isDownloading}
          onClick={(event) => { onDownload(event); onClose(); }}>
          {isDownloading ? (
            <span className="h-6 w-6 rounded-full border-2 border-white/70 border-t-transparent animate-spin" aria-hidden="true" />
          ) : (
            <Download className="h-6 w-6 text-white/80" strokeWidth={1.6} aria-hidden="true" />
          )}
          {isDownloading ? texts.downloading : texts.downloadWallpaper}
        </button>
      </div>
      {showLink && <div className="px-5 pb-4">
        <label className="block text-xs text-white/60">{shareTexts.copyLink}
          <input readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()}
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/80 focus:outline-white/70" />
        </label>
        {shareStatus && <p role="status" className="mt-2 text-xs text-white/60">{shareStatus}</p>}
      </div>}
      <button type="button" className="min-h-13 w-full border-t border-white/[0.08] text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white/70 motion-reduce:transition-none" onClick={onClose}>{texts.cancel}</button>
    </dialog>
  );
}
