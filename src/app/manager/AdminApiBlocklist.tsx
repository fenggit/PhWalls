'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { getApiMonitorTexts } from '@/lib/i18n';
import { normalizeClientIp } from '@/lib/client-ip';

const texts = getApiMonitorTexts('zh');
const buttonClass = 'rounded-md border border-[#d8dfdb] bg-white px-3 py-2 text-sm hover:bg-[#f4f7f4] focus-visible:outline-2 focus-visible:outline-[#247560] disabled:opacity-50';
type Entry = { ip: string; created_at: number };
type Controls = { entries: Entry[]; pending: boolean; mutate: (ip: string, remove: boolean) => Promise<void> };
const BlocklistContext = createContext<Controls | null>(null);

export function MonitorIp({ ip }: { ip: string | null }) {
  const controls = useContext(BlocklistContext);
  const normalized = normalizeClientIp(ip);
  const blocked = controls?.entries.some((entry) => entry.ip === normalized);
  return <div className="space-y-1"><span className="break-all font-mono">{ip || texts.unknown}</span>
    {normalized && controls && <button type="button" disabled={controls.pending || blocked}
      aria-label={`${blocked ? texts.blocked : texts.blockIp} ${ip}`}
      className="block rounded border border-[#d8dfdb] px-2 py-1 text-xs text-[#247560] hover:bg-[#f4f7f4] focus-visible:outline-2 disabled:opacity-50"
      onClick={() => void controls.mutate(normalized, false)}>{blocked ? texts.blocked : texts.blockIp}</button>}
  </div>;
}

export function ApiBlocklistProvider({ refreshKey, children }: { refreshKey: number; children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const mutationPending = useRef(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [message, setMessage] = useState('');
  const [input, setInput] = useState('');
  const loadPage = useRef(1);
  const lastRefreshKey = useRef(refreshKey);
  useEffect(() => {
    const controller = new AbortController();
    if (lastRefreshKey.current !== refreshKey) loadPage.current = 1;
    lastRefreshKey.current = refreshKey;
    const nextPage = loadPage.current;
    setLoading(true); setListError('');
    void (async () => {
      try {
        const response = await fetch(`/api/admin/api-monitor/blocklist?page=${nextPage}`, {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        });
        const result = await response.json() as { data?: Entry[]; hasMore?: boolean };
        if (!response.ok || !result.data) throw new Error(texts.blockUnavailable);
        if (controller.signal.aborted) return;
        const next = result.data;
        setEntries((current) => nextPage === 1 ? next : [...current, ...next.filter((entry) => !current.some((row) => row.ip === entry.ip))]);
        setHasMore(!!result.hasMore); setPage(nextPage);
      } catch {
        if (!controller.signal.aborted) setListError(texts.blockUnavailable);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [revision, refreshKey]);
  const reload = (nextPage = 1) => { loadPage.current = nextPage; setRevision((value) => value + 1); };
  const mutate = async (raw: string, remove: boolean) => {
    if (mutationPending.current) return;
    const ip = normalizeClientIp(raw.trim());
    setError(''); setMessage('');
    if (!ip) { setError(texts.invalidIp); return; }
    mutationPending.current = true; setPending(true);
    try {
      const response = await fetch('/api/admin/api-monitor/blocklist', {
        method: remove ? 'DELETE' : 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-Phwalls-Admin': '1' }, body: JSON.stringify({ ip }),
      });
      if (!response.ok) throw new Error(response.status === 503 ? texts.blockUnavailable : texts.blockFailed);
      setEntries((current) => remove ? current.filter((entry) => entry.ip !== ip)
        : current.some((entry) => entry.ip === ip) ? current : [{ ip, created_at: Date.now() }, ...current]);
      setMessage((remove ? texts.unblockSuccess : texts.blockSuccess).replace('{ip}', ip));
      if (!remove) setInput('');
      reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : texts.blockFailed); }
    finally { mutationPending.current = false; setPending(false); }
  };
  return <BlocklistContext.Provider value={{ entries, pending, mutate }}>
    <section aria-label={texts.blocklist} className="space-y-3 rounded-lg border border-[#dfe6df] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-sm font-semibold">{texts.blocklist}</h3>
        <button type="button" className={buttonClass} disabled={loading || pending} onClick={() => reload()}>{texts.refresh}</button></div>
      <p className="text-xs leading-5 text-[#66746b]">{texts.blockHint}</p>
      <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void mutate(input, false); }}>
        <input aria-label={texts.ipInput} placeholder={texts.ipInput} value={input} maxLength={45} required
          onChange={(event) => setInput(event.target.value)} className="min-w-0 flex-1 rounded-md border border-[#d8dfdb] px-3 py-2 text-sm" />
        <button type="submit" className={buttonClass} disabled={pending}>{texts.blockIp}</button>
        <button type="button" className={buttonClass} disabled={pending || !input.trim()} onClick={() => void mutate(input, true)}>{texts.unblockIp}</button>
      </form>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="break-all text-sm text-[#247560]">{message}</p>}
      {listError && <p role="alert" className="text-sm text-red-800">{listError}</p>}
      {loading && <p role="status" className="text-xs text-[#66746b]">{texts.blockLoading}</p>}
      {!loading && !listError && !entries.length && <p className="text-xs text-[#66746b]">{texts.blockEmpty}</p>}
      <ul className="divide-y divide-[#ebefeb]">{entries.map((entry) => <li key={entry.ip} className="flex flex-wrap items-center justify-between gap-3 py-2">
        <div className="min-w-0"><p className="break-all font-mono text-sm">{entry.ip}</p><p className="text-xs text-[#66746b]">{texts.blockCreated} · {new Date(entry.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</p></div>
        <button type="button" className={buttonClass} disabled={pending} aria-label={`${texts.unblockIp} ${entry.ip}`} onClick={() => void mutate(entry.ip, true)}>{texts.unblockIp}</button>
      </li>)}</ul>
      {hasMore && <button type="button" className={buttonClass} disabled={loading || pending} onClick={() => reload(listError ? loadPage.current : page + 1)}>{texts.blockMore}</button>}
    </section>
    {children}
  </BlocklistContext.Provider>;
}
