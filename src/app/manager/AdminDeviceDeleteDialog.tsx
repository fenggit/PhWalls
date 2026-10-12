'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Images, RefreshCw, Trash2, X } from 'lucide-react';
import type { AdminDeviceDeletionPreview, AdminDeviceDeletionResult } from '@/lib/admin-device-deletion';
import type { DeviceRow, WallpaperMediaType } from '@/lib/wallpaper-db';
import { getI18nTexts } from '@/lib/i18n';
import { buildPublicR2Url } from '@/lib/r2-public-url';

const buttonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#d8dfdb] bg-white px-3 text-sm font-medium hover:bg-[#f4f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#247560] disabled:cursor-not-allowed disabled:opacity-50';

type Props = {
  device: Pick<DeviceRow, 'id' | 'device_name'>;
  media?: WallpaperMediaType | null;
  request: <T>(path: string, method?: string, body?: unknown) => Promise<T>;
  onClose: () => void;
  onDeleted: (result: AdminDeviceDeletionResult) => Promise<void>;
};

export default function AdminDeviceDeleteDialog({ device, media, request, onClose, onDeleted }: Props) {
  const texts = getI18nTexts('zh');
  const title = media ? texts.adminCollectionDelete : texts.adminDeviceDelete;
  const mediaLabel = media === 'dynamic' ? texts.adminUploadDynamicLabel : texts.adminUploadStaticLabel;
  const ref = useRef<HTMLDialogElement>(null);
  const requestId = useRef(0);
  const [preview, setPreview] = useState<AdminDeviceDeletionPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setPreview(null);
    try {
      const { data } = await request<{ data: AdminDeviceDeletionPreview }>(`devices?${new URLSearchParams({ delete_preview: device.id, ...(media ? { media_type: media } : {}) })}`);
      if (current === requestId.current) setPreview(data);
    } catch (cause) {
      if (current === requestId.current) setError(cause instanceof Error ? cause.message : texts.adminDeviceDeleteReviewRequired);
    } finally { if (current === requestId.current) setLoading(false); }
  }, [device.id, media, request, texts.adminDeviceDeleteReviewRequired]);

  useEffect(() => {
    const generation = requestId;
    ref.current?.showModal();
    void refresh();
    return () => { generation.current++; };
  }, [refresh]);

  const remove = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!preview || loading || busy || preview.blocked_reason) return;
    setBusy(true);
    setError('');
    try {
      const result = await request<AdminDeviceDeletionResult>('devices', 'DELETE', { id: device.id,
        ...(media ? { media_type: media } : {}), snapshot: preview.snapshot });
      await onDeleted(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : texts.adminDeviceDeleteRetryHint);
      await refresh();
    } finally { setBusy(false); }
  };
  const shared = new Set(preview?.files.filter((file) => file.shared).map((file) => file.key));

  return <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}
    className="fixed m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-4xl overflow-hidden rounded-lg border border-[#dce5dd] bg-white p-0 text-[#25332d] shadow-xl backdrop:bg-[#15271e]/50 backdrop:backdrop-blur-sm">
    <form onSubmit={remove} className="flex max-h-[calc(100dvh-2rem)] flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-[#e3e9e4] px-5 py-4">
        <div className="min-w-0"><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 break-words text-sm">{device.device_name}{media ? ` · ${mediaLabel}` : ''}</p></div>
        <button type="button" className={`${buttonClass} w-10 shrink-0 px-0`} aria-label={texts.adminDeviceDeleteClose} disabled={busy} onClick={onClose}><X size={16} /></button>
      </div>
      <div className="min-h-0 overflow-y-auto p-5" aria-busy={loading}>
        <p className="text-sm leading-6 text-red-800">{media ? texts.adminCollectionDeleteWarning : texts.adminDeviceDeleteWarning}</p>
        {loading && <p role="status" className="mt-4 text-sm text-[#66746b]">{texts.adminDeviceDeleteLoading}</p>}
        {preview && <>
          <p className="mt-4 text-sm font-medium tabular-nums">{texts.adminDeviceDeleteSummary.replace('{count}', String(preview.wallpapers.length))
            .replace('{files}', String(preview.files.filter((file) => !file.shared).length)).replace('{translations}', String(preview.translation_count))}</p>
          {preview.wallpapers.length === 0 && <p className="mt-3 text-sm text-[#66746b]">{texts.adminDeviceDeleteEmpty}</p>}
          <ol className="mt-4 space-y-3">{preview.wallpapers.map((wallpaper, index) => {
            const files = [wallpaper.origin_key, wallpaper.compress_key, wallpaper.media_type === 'dynamic'
              ? wallpaper.origin_key.replace('/origin/', '/preview/') : null].filter((key): key is string => Boolean(key));
            return <li key={wallpaper.id} className="rounded-md border border-[#dfe6df] p-3">
              <div className="flex gap-3">
                <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-[#edf1ec]">{wallpaper.compress_key && wallpaper.deletion_state === 'none'
                  ? <img alt="" loading="lazy" src={buildPublicR2Url(wallpaper.compress_key) || ''} className="h-full w-full object-cover" />
                  : <Images size={18} className="mx-auto mt-5 text-[#9aaba0]" />}</div>
                <div className="min-w-0"><p className="break-words text-sm font-semibold">{index + 1}. {wallpaper.name}</p>
                  <p className="mt-1 text-xs text-[#66746b]">{wallpaper.media_type === 'dynamic' ? texts.adminUploadDynamicLabel : texts.adminUploadStaticLabel} · {wallpaper.file_format.toUpperCase()}</p></div>
              </div>
              <ul className="mt-3 space-y-2">{Array.from(new Set(files)).map((key) => <li key={key} className="text-xs">
                <span className={shared.has(key) ? 'text-amber-800' : 'text-red-700'}>{shared.has(key) ? texts.adminDeviceDeleteShared : texts.adminDeviceDeleteFile}</span>
                <span className="mt-0.5 block break-all font-mono text-[#66746b]">{key}</span>
              </li>)}</ul>
            </li>;
          })}</ol>
          {preview.blocked_reason && <p role="alert" className="mt-4 text-sm leading-6 text-red-700">{preview.blocked_reason}</p>}
        </>}
        {error && <p role="alert" className="mt-4 text-sm leading-6 text-red-700">{error}</p>}
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-[#e3e9e4] bg-[#f8faf8] px-5 py-4">
        <button type="button" className={buttonClass} disabled={busy || loading} onClick={() => { setError(''); void refresh(); }}><RefreshCw size={16} />{texts.adminDeviceDeleteRefresh}</button>
        <button type="button" className={buttonClass} disabled={busy} onClick={onClose}>{texts.adminDeviceDeleteCancel}</button>
        <button type="submit" disabled={busy || loading || !preview || !!preview.blocked_reason}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:cursor-not-allowed disabled:opacity-50">
          <Trash2 size={16} />{busy ? texts.adminDeviceDeleting : media ? texts.adminCollectionDeleteConfirm : texts.adminDeviceDeleteConfirm}
        </button>
      </div>
    </form>
  </dialog>;
}
