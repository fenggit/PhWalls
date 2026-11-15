'use client';

import { useEffect, useRef, useState } from 'react';

export default function AdminAdSettings({ refreshKey }: { refreshKey: number }) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const busy = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setReady(false); setError(''); setMessage('');
    void (async () => {
      try {
        const response = await fetch('/api/admin/ad-settings', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error();
        const data = await response.json() as { ads_enabled: boolean };
        if (!controller.signal.aborted) { setEnabled(data.ads_enabled); setReady(true); }
      } catch { if (!controller.signal.aborted) setError('广告设置加载失败，请重试。'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })();
    return () => controller.abort();
  }, [refreshKey, revision]);

  async function save() {
    if (busy.current || !ready) return;
    busy.current = true; setSaving(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/admin/ad-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Phwalls-Admin': '1' },
        body: JSON.stringify({ ads_enabled: enabled }),
      });
      if (!response.ok) throw new Error();
      setMessage(enabled ? '已开启广告。' : '已关闭广告。');
    } catch { setError('广告设置保存失败，请重试。'); }
    finally { busy.current = false; setSaving(false); }
  }

  return <section className="max-w-2xl rounded-lg border border-[#dfe6df] bg-white p-6">
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <div>
        <label htmlFor="ads-enabled" className="text-sm font-semibold">显示广告</label>
        <p id="ads-enabled-hint" className="mt-2 text-sm leading-6 text-[#66746b]">关闭后，访客后续加载页面时不会载入 Google AdSense 脚本；默认开启。</p>
      </div>
      <label className="flex items-center gap-3 text-sm" htmlFor="ads-enabled">
        <input id="ads-enabled" type="checkbox" checked={enabled} disabled={loading || saving || !ready}
          aria-describedby="ads-enabled-hint" onChange={(event) => { setEnabled(event.target.checked); setMessage(''); }}
          className="h-4 w-4 accent-[#247560] disabled:opacity-50" />
        <span>{enabled ? '广告已开启' : '广告已关闭'}</span>
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="text-sm text-[#247560]">{message}</p>}
      <div className="flex gap-3"><button disabled={loading || saving || !ready} className="rounded-md bg-[#247560] px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? '保存中…' : '保存'}</button>
        <button type="button" disabled={loading || saving} onClick={() => setRevision((value) => value + 1)} className="rounded-md border border-[#d8dfdb] px-4 py-2 text-sm disabled:opacity-50">重新加载</button></div>
    </form>
  </section>;
}
