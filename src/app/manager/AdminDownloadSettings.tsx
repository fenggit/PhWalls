'use client';

import { useEffect, useRef, useState } from 'react';
import { getDownloadQuotaTexts } from '@/lib/i18n';

const texts = getDownloadQuotaTexts('zh');
export default function AdminDownloadSettings({ refreshKey }: { refreshKey: number }) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setReady(false); setError(''); setMessage('');
    void (async () => {
      try {
        const response = await fetch('/api/admin/download-settings', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json() as { daily_limit: number | null };
        if (!controller.signal.aborted) { setValue(data.daily_limit === null ? '' : String(data.daily_limit)); setReady(true); }
      } catch { if (!controller.signal.aborted) setError(texts.failed); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [refreshKey, revision]);
  async function save() {
    if (busy.current || !ready) return;
    const limit = value.trim() === '' ? null : Number(value);
    setError(''); setMessage('');
    if (limit !== null && (!/^\d+$/.test(value) || !Number.isSafeInteger(limit) || limit > 1000000)) { setError(texts.invalid); return; }
    busy.current = true; setSaving(true);
    try {
      const response = await fetch('/api/admin/download-settings', { method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Phwalls-Admin': '1' }, body: JSON.stringify({ daily_limit: limit }) });
      if (!response.ok) throw new Error();
      setMessage(texts.saved);
    } catch { setError(texts.failed); }
    finally { busy.current = false; setSaving(false); }
  }
  return <section className="max-w-2xl rounded-lg border border-[#dfe6df] bg-white p-6">
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <label htmlFor="daily-download-limit" className="block text-sm font-semibold">{texts.label}</label>
      <p id="download-limit-hint" className="text-sm leading-6 text-[#66746b]">{texts.hint}</p>
      <input id="daily-download-limit" aria-describedby="download-limit-hint" type="number" min="0" max="1000000" step="1" placeholder={texts.unlimited}
        value={value} onChange={(event) => { setValue(event.target.value); setMessage(''); }} disabled={loading || saving || !ready}
        className="w-full rounded-md border border-[#d8dfdb] px-3 py-2 text-sm disabled:opacity-50" />
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-[#247560]">{message}</p>}
      <div className="flex gap-3"><button disabled={loading || saving || !ready} className="rounded-md bg-[#247560] px-4 py-2 text-sm text-white disabled:opacity-50">{texts.save}</button>
        <button type="button" disabled={loading || saving} onClick={() => setRevision((n) => n + 1)} className="rounded-md border border-[#d8dfdb] px-4 py-2 text-sm disabled:opacity-50">{texts.reload}</button></div>
    </form>
  </section>;
}
