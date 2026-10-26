'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAdminMixedUploadTexts } from '@/lib/i18n';
import type { DeviceRow, WallpaperMediaType, WallpaperRow } from '@/lib/wallpaper-db';

export type CollectionCheck = {
  snapshot: string; wallpaper_ids: string[]; device_status: DeviceRow['status'];
  groups: { category: string; media_type: WallpaperMediaType; wallpaper_ids: string[]; primary_ids: string[]; published_primary_ids: string[]; requires_primary: boolean }[];
  issues: { code: string; message: string }[];
  other_media_visibility: { static: number; dynamic: number }; requires_visibility_acknowledgement: boolean;
};
type Request = <T>(path: string, method?: string, body?: unknown) => Promise<T>;
const button = 'inline-flex min-h-10 items-center justify-center rounded-md border border-[#d8dfdb] px-3 text-sm disabled:opacity-50';
const primary = `${button} border-transparent bg-[#247560] text-white`;

export default function AdminCollectionActionPanel({ device, media, initialIds, operation = 'publish', request, onClose, onDone }: {
  device: Pick<DeviceRow, 'id' | 'device_name'>; media?: WallpaperMediaType; initialIds?: string[];
  operation?: 'publish' | 'unpublish'; request: Request; onClose: () => void; onDone: (ids: string[]) => void | Promise<void>;
}) {
  const t = getAdminMixedUploadTexts('zh');
  const [rows, setRows] = useState<WallpaperRow[]>([]);
  const [selected, setSelected] = useState<string[]>(initialIds || []);
  const [check, setCheck] = useState<CollectionCheck | null>(null);
  const [primaries, setPrimaries] = useState<Record<string, string>>({});
  const [ack, setAck] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [checking, setChecking] = useState(false);
  const submitting = useRef(false);
  const selectedKey = JSON.stringify(selected);
  const initialIdSet = useMemo(() => initialIds ? new Set(initialIds) : null, [initialIds]);
  useEffect(() => {
    if (operation === 'unpublish') { setLoading(false); return; }
    let cancelled = false;
    void (async () => {
      const collected: WallpaperRow[] = [];
      let page = 0;
      for (;;) {
        const query = new URLSearchParams({ device: device.id, page: String(page) });
        if (media) query.set('media', media);
        const result = await request<{ data: WallpaperRow[]; total: number }>(`wallpapers?${query}`);
        if (cancelled) return;
        collected.push(...result.data);
        if (!result.data.length || collected.length >= result.total) break;
        page++;
      }
      setRows(collected.filter(row => row.status !== 'published' && (!row.deletion_state || row.deletion_state === 'none') && (!initialIdSet || initialIdSet.has(row.id))));
    })().catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [device.id, media, operation, request, initialIdSet]);
  useEffect(() => {
    let cancelled = false;
    setCheck(null); setAck(false); setPrimaries({});
    if (operation === 'publish' && !selected.length) { setChecking(false); return; }
    setChecking(true);
    const query = new URLSearchParams({ id: device.id });
    if (operation === 'unpublish') { query.set('operation', 'unpublish'); if (media) query.set('media', media); }
    else query.set('ids', selectedKey);
    void request<{ data: CollectionCheck }>(`device-check?${query}`)
      .then(result => { if (!cancelled) setCheck(result.data); })
      .catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause)); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
    // selectedKey is the stable value of the explicit selection.
  }, [device.id, media, operation, request, selectedKey, revision, selected.length]);
  const deficient = check?.groups.filter(group => group.requires_primary) || [];
  const blockers = check?.issues.filter(issue => !issue.code.includes('primary')) || [];
  const ready = !!check && check.wallpaper_ids.length > 0 && !blockers.length && (operation === 'unpublish' ||
    (!blockers.length && deficient.every(group => primaries[`${group.category}:${group.media_type}`]) && (!check.requires_visibility_acknowledgement || ack)));
  const submit = async () => {
    if (!check || !ready || submitting.current) return;
    submitting.current = true;
    setBusy(true); setError('');
    try {
      await request(`collections/${operation}`, 'POST', operation === 'unpublish'
        ? { device_id: device.id, media_type: media, snapshot: check.snapshot }
        : { device_id: device.id, wallpaper_ids: selected, snapshot: check.snapshot, primary_ids: Object.values(primaries).filter(Boolean),
          make_device_visible: check.device_status !== 'published', acknowledge_other_media_visibility: ack });
      await onDone(check.wallpaper_ids);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); setCheck(null); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <div className="max-h-[calc(100dvh-3rem)] overflow-y-auto rounded-lg bg-white p-5 text-[#25332d] sm:p-6">
    <h2 className="text-lg font-semibold">{device.device_name} · {operation === 'publish' ? t.publishSelected : t.unpublish}{media ? ` · ${t[media]}` : ''}</h2>
    <p className="mt-3 text-sm leading-6 text-[#66746b]">{operation === 'publish' ? t.publishScope : t.unpublishHelp}</p>
    {loading ? <p role="status" className="my-4 text-sm">{t.loading}</p> : operation === 'publish' && <div className="my-4 max-h-64 space-y-1 overflow-y-auto rounded border border-[#dfe6df] p-3">
      {rows.map(row => <label key={row.id} className="flex items-center gap-3 py-2 text-sm">
        <input type="checkbox" disabled={busy} checked={selected.includes(row.id)} onChange={event => setSelected(ids => event.target.checked ? [...ids, row.id] : ids.filter(id => id !== row.id))} />
        <span className="min-w-0 break-words">{row.name} <span className="text-xs text-[#66746b]">{t[row.media_type]} · {row.category}</span></span>
      </label>)}
      {!rows.length && <p className="text-sm text-[#66746b]">{t.noneSelected}</p>}
    </div>}
    {check ? <div className="space-y-3 text-sm">
      <p>{t.selected}：{check.wallpaper_ids.length}</p>
      {check.groups.map(group => <div key={`${group.category}:${group.media_type}`} className="rounded border border-[#dfe6df] p-3">
        <p className="font-medium">{t[group.media_type]} · {group.category} · {group.wallpaper_ids.length}</p>
        {operation === 'publish' && group.requires_primary && <label className="mt-2 block">{t.choosePrimary}
          <select className="mt-1 h-10 w-full rounded border border-[#d8dfdb] bg-white px-2" value={primaries[`${group.category}:${group.media_type}`] || ''}
            onChange={event => setPrimaries(previous => ({ ...previous, [`${group.category}:${group.media_type}`]: event.target.value }))}>
            <option value="">{t.choosePrimary}</option>{group.wallpaper_ids.map(id => <option key={id} value={id}>{rows.find(row => row.id === id)?.name || id}</option>)}
          </select></label>}
      </div>)}
      {check.issues.length > 0 && <ul className="list-inside list-disc text-amber-800">{check.issues.map((issue, index) => <li key={index}>{issue.message}</li>)}</ul>}
      {operation === 'publish' && check.device_status !== 'published' && <div className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
        <p>{t.visibility}</p><p className="mt-1">{t.otherVisible}：{t.static} {check.other_media_visibility.static} · {t.dynamic} {check.other_media_visibility.dynamic}</p>
        {check.requires_visibility_acknowledgement && <label className="mt-3 flex items-start gap-2"><input type="checkbox" className="mt-1" checked={ack} onChange={event => setAck(event.target.checked)} /><span>{t.ackVisibility}</span></label>}
      </div>}
    </div> : !loading && <p role="status" className="my-3 text-sm text-[#66746b]">{checking ? t.loading : selected.length || operation === 'unpublish' ? t.refreshCheck : t.noneSelected}</p>}
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    <div className="mt-5 flex flex-wrap justify-end gap-2">
      <button className={button} disabled={busy} onClick={() => { setError(''); setRevision(value => value + 1); }}>{t.refreshCheck}</button>
      <button className={button} disabled={busy} onClick={onClose}>{operation === 'publish' ? t.drafts : t.cancel}</button>
      <button className={primary} disabled={!ready || busy} onClick={() => void submit()}>{operation === 'publish' ? t.publishSelected : t.unpublish}</button>
    </div>
  </div>;
}
