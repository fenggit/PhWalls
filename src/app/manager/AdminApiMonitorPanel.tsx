'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { getApiMonitorTexts } from '@/lib/i18n';
import type { ApiMonitorRange, ApiMonitorReport, ApiSource } from '@/lib/api-monitor-types';

const texts = getApiMonitorTexts('zh');
const buttonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#d8dfdb] bg-white px-3 text-sm font-medium hover:bg-[#f4f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#247560] disabled:opacity-50';
const sourceLabels: Record<ApiSource, string> = {
  site: texts.site, own_mini: texts.own_mini, wechat: texts.wechat, external: texts.externalSource, unknown: texts.unknown,
};
const time = (value: number) => new Date(value).toLocaleString('zh-CN', {
  timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});
const count = (value: number) => value.toLocaleString('zh-CN');

function MonitorTable({ title, columns, children, empty }: {
  title: string; columns: string[]; children: ReactNode; empty?: boolean;
}) {
  return <section className="min-w-0 overflow-hidden rounded-lg border border-[#dfe6df] bg-white">
    <h3 className="border-b border-[#e3e9e4] px-4 py-3 text-sm font-semibold">{title}</h3>
    <div className="overflow-x-auto"><table className="w-full text-left text-xs [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_th]:whitespace-nowrap [&_th]:px-4 [&_th]:py-3 [&_tr]:border-b [&_tr]:border-[#ebefeb]">
      <caption className="sr-only">{title}</caption>
      <thead className="bg-[#f8faf8] text-[#5e7065]"><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody className="tabular-nums">{empty ? <tr><td colSpan={columns.length} className="text-[#66746b]">{texts.empty}</td></tr> : children}</tbody>
    </table></div>
  </section>;
}

type Payload = { data: ApiMonitorReport; enabled: boolean; miniAppId: string | null };

export default function AdminApiMonitorPanel({ refreshKey }: { refreshKey: number }) {
  const [range, setRange] = useState<ApiMonitorRange>('24h');
  const [revision, setRevision] = useState(0);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setPayload(null);
    void (async () => {
      try {
        const response = await fetch(`/api/admin/api-monitor?range=${range}`, {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) throw new Error(response.status === 503 ? texts.unavailable : texts.error);
        const result = await response.json() as Payload;
        if (!controller.signal.aborted) setPayload(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : texts.error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [range, revision, refreshKey]);

  const report = payload?.data;
  const peak = Math.max(1, ...(report?.trend.map((bucket) => bucket.requests) || []));
  const thresholds = report?.thresholds;
  const thresholdHint = thresholds ? texts.thresholdHint.replace('{requests}', String(thresholds.requests))
    .replace('{downloads}', String(thresholds.downloads)).replace('{targets}', String(thresholds.targets)) : '';

  return <section aria-label={texts.title} aria-busy={loading} className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex items-center gap-3 text-sm">{texts.rangeLabel}
        <select value={range} onChange={(event) => setRange(event.target.value as ApiMonitorRange)}
          className="h-10 rounded-md border border-[#d8dfdb] bg-white px-3 focus-visible:outline-2 focus-visible:outline-[#247560]">
          <option value="1h">{texts.range1h}</option><option value="24h">{texts.range24h}</option><option value="7d">{texts.range7d}</option>
        </select>
      </label>
      <button className={buttonClass} disabled={loading} onClick={() => setRevision((value) => value + 1)}>
        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />{texts.refresh}
      </button>
    </div>
    <div className="space-y-1 rounded-lg border border-[#dfe6df] bg-white p-4 text-xs leading-5 text-[#66746b]">
      {payload && <p className={payload.enabled ? 'font-medium text-[#247560]' : 'font-medium text-amber-800'}>{payload.enabled ? texts.enabled : texts.disabled}</p>}
      <p>{texts.sourceHint}</p><p>{texts.coverageHint}</p><p>{texts.retentionHint}</p>
      {payload && <p>{texts.appId}：<span className="break-all font-mono">{payload.miniAppId || texts.notConfigured}</span></p>}
    </div>
    {loading && <p role="status" className="py-8 text-center text-sm text-[#66746b]">{texts.loading}</p>}
    {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <p className="flex-1">{error}</p><button className={buttonClass} onClick={() => setRevision((value) => value + 1)}>{texts.refresh}</button>
    </div>}
    {report && <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {([
          [texts.requests, count(report.summary.requests)], [texts.clients, count(report.summary.clients)],
          [texts.downloads, count(report.summary.downloads)], [texts.errors, count(report.summary.errors)],
          [texts.external, count(report.summary.external)], [texts.avgLatency, `${report.summary.avg_ms} ms`],
        ] as const).map(([label, value]) => <div key={label} className="rounded-lg border border-[#dfe6df] bg-white p-4">
          <p className="text-xs text-[#66746b]">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
        </div>)}
      </div>
      {!report.summary.requests && <p role="status" className="rounded-md border border-[#dfe6df] bg-white p-4 text-sm text-[#66746b]">{texts.empty}</p>}
      <figure className="rounded-lg border border-[#dfe6df] bg-white p-4">
        <figcaption className="mb-5 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
          <span>{texts.trend}</span><span className="text-xs font-normal text-[#758278]">{texts.updated}：{time(report.until)}</span>
        </figcaption>
        <div role="img" aria-label={`${texts.trend} · ${texts.requests} ${report.summary.requests}`} className="flex h-36 items-end gap-1 border-b border-[#dfe6df]">
          {report.trend.map((bucket) => <div key={bucket.bucket} title={`${time(bucket.bucket)} · ${texts.requests}: ${bucket.requests} · ${texts.errors}: ${bucket.errors}`}
            className={`min-w-0 flex-1 rounded-t-sm ${bucket.errors ? 'bg-amber-600' : 'bg-[#247560]'}`}
            style={{ height: `${bucket.requests / peak * 100}%`, minHeight: bucket.requests ? 2 : 0 }} />)}
        </div>
        <div className="mt-2 flex justify-between text-[11px] tabular-nums text-[#758278]"><span>{time(report.since)}</span><span>{time(report.until)}</span></div>
      </figure>
      <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-4" aria-label={texts.alerts}>
        <h3 className="text-sm font-semibold">{texts.alerts}</h3><p className="text-xs leading-5 text-amber-900">{thresholdHint}<br />{texts.normalHint}</p>
        {report.alerts.length ? <MonitorTable title={texts.alerts}
          columns={[texts.time, texts.ip, texts.requestsMinute, texts.downloadsMinute, texts.targetsMinute]}>
          {report.alerts.map((row) => <tr key={`${row.client_ip}:${row.minute}`}>
            <td className="whitespace-nowrap">{time(row.minute)}</td><td className="font-mono">{row.client_ip}</td>
            <td>{count(row.requests)}</td><td>{count(row.downloads)}</td><td>{count(row.targets)}</td>
          </tr>)}
        </MonitorTable> : <p className="text-xs text-[#66746b]">{texts.alertsEmpty}</p>}
      </section>
      <div className="grid min-w-0 gap-5 xl:grid-cols-2">
        <MonitorTable title={texts.endpoints} columns={[texts.endpoint, texts.requests, texts.errors, texts.avgLatency]} empty={!report.endpoints.length}>
          {report.endpoints.map((row) => <tr key={row.endpoint}><td className="break-all font-mono">{row.endpoint}</td>
            <td>{count(row.requests)}</td><td>{count(row.errors)}</td><td className="whitespace-nowrap">{row.avg_ms} ms</td></tr>)}
        </MonitorTable>
        <MonitorTable title={texts.sources} columns={[texts.source, texts.domain, texts.requests]} empty={!report.sources.length}>
          {report.sources.map((row) => <tr key={`${row.source}:${row.source_host}:${row.mini_app_id}`}>
            <td className="whitespace-nowrap">{sourceLabels[row.source]}</td><td className="break-all font-mono">{row.source_host || texts.unknown}
              {row.mini_app_id && <div className="mt-1 text-[#758278]">{row.mini_app_id}</div>}</td><td>{count(row.requests)}</td>
          </tr>)}
        </MonitorTable>
      </div>
      <MonitorTable title={texts.topClients} columns={[texts.ip, texts.requests, texts.downloads, texts.targets, texts.errors, texts.time]} empty={!report.clients.length}>
        {report.clients.map((row) => <tr key={row.client_ip}><td className="font-mono">{row.client_ip}</td><td>{count(row.requests)}</td>
          <td>{count(row.downloads)}</td><td>{count(row.targets)}</td><td>{count(row.errors)}</td><td className="whitespace-nowrap">{time(row.last_seen)}</td></tr>)}
      </MonitorTable>
      <MonitorTable title={texts.recent} columns={[texts.time, texts.endpoint, texts.ip, texts.country, texts.source, texts.userAgent, texts.status, texts.duration]} empty={!report.recent.length}>
        {report.recent.map((row) => <tr key={row.id}>
          <td className="whitespace-nowrap">{time(row.created_at)}</td><td className="break-all font-mono">{row.method} {row.endpoint}</td>
          <td className="font-mono">{row.client_ip || texts.unknown}</td><td>{row.country || texts.unknown}</td>
          <td><p className="whitespace-nowrap">{sourceLabels[row.source]}</p><p className="mt-1 break-all text-[#758278]">{row.source_host || '—'}</p></td>
          <td><span className="block w-44 truncate text-[#66746b]" title={row.user_agent}>{row.user_agent || texts.unknown}</span></td>
          <td className={row.status >= 400 ? 'font-medium text-red-700' : ''}>{row.status}</td><td className="whitespace-nowrap">{row.duration_ms} ms</td>
        </tr>)}
      </MonitorTable>
      <p className="text-xs text-[#758278]">{texts.rowsLimited}</p>
    </>}
  </section>;
}
