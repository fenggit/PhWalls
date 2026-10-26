'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, RefreshCw, X } from 'lucide-react';
import { getApiMonitorTexts } from '@/lib/i18n';
import type { ApiMonitorRange, ApiMonitorReport, ApiSource, ApiMonitorClientsPage, ApiMonitorClient, ApiMonitorDetailKind, ApiMonitorDetailsPage } from '@/lib/api-monitor-types';

const texts = getApiMonitorTexts('zh');
const buttonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#d8dfdb] bg-white px-3 text-sm font-medium hover:bg-[#f4f7f4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#247560] disabled:opacity-50';
const sourceLabels: Record<ApiSource, string> = {
  site: texts.site, own_mini: texts.own_mini, wechat: texts.wechat, external: texts.externalSource, unknown: texts.unknown,
};
const time = (value: number) => new Date(value).toLocaleString('zh-CN', {
  timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
});
const count = (value: number) => value.toLocaleString('zh-CN');

function MonitorTable({ title, columns, children, empty, footer, wide }: {
  title: string; columns: string[]; children: ReactNode; empty?: boolean; footer?: ReactNode; wide?: boolean;
}) {
  return <section className="min-w-0 overflow-hidden rounded-lg border border-[#dfe6df] bg-white">
    <h3 className="border-b border-[#e3e9e4] px-4 py-3 text-sm font-semibold">{title}</h3>
    <div className="overflow-x-auto"><table className={`${wide ? 'min-w-[880px]' : ''} w-full text-left text-xs [&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_th]:whitespace-nowrap [&_th]:px-4 [&_th]:py-3 [&_tr]:border-b [&_tr]:border-[#ebefeb]`}>
      <caption className="sr-only">{title}</caption>
      <thead className="bg-[#f8faf8] text-[#5e7065]"><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody className="tabular-nums">{empty ? <tr><td colSpan={columns.length} className="text-[#66746b]">{texts.empty}</td></tr> : children}</tbody>
    </table></div>{footer}
  </section>;
}

function ClientSignals({ row, thresholds }: { row: ApiMonitorClient; thresholds: ApiMonitorReport['thresholds'] }) {
  const flags = [
    row.peak_requests >= thresholds.requests ? `${texts.highRequests} (${row.peak_requests}/min)` : '',
    row.peak_downloads >= thresholds.downloads ? `${texts.bulkDownloads} (${row.peak_downloads}/min)` : '',
    row.peak_targets >= thresholds.targets ? `${texts.resourceScan} (${row.peak_targets}/min)` : '',
  ].filter(Boolean);
  return <div className="flex min-w-36 flex-wrap gap-1">
    {flags.map((flag) => <span key={flag} className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-900">{flag}</span>)}
    {row.errors > 0 && <span className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-800">{texts.httpErrors} ({row.errors})</span>}
    {!flags.length && !row.errors && <span className="text-[#66746b]">{texts.noSignals}</span>}
  </div>;
}

const detailLabels: Record<ApiMonitorDetailKind, string> = {
  errors: texts.errors, external: texts.external, anomalous: texts.anomalousClients,
};

function MonitorDetails({ kind, report, onClose }: {
  kind: ApiMonitorDetailKind; report: ApiMonitorReport; onClose: () => void;
}) {
  const { range, until } = report;
  const [data, setData] = useState<ApiMonitorDetailsPage | null>(null);
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const panel = useRef<HTMLElement | null>(null);
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({ block: 'nearest' });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    void (async () => {
      try {
        const query = new URLSearchParams({ view: 'details', kind, range, until: String(until), page: String(page) });
        const response = await fetch(`/api/admin/api-monitor?${query}`, {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        });
        const result = await response.json() as { data?: ApiMonitorDetailsPage; error?: string };
        if (!response.ok || !result.data) throw new Error(result.error === 'SNAPSHOT_EXPIRED' ? texts.snapshotExpired : texts.detailsFailed);
        if (controller.signal.aborted) return;
        const next = result.data;
        setData((current) => {
          if (!current || page === 1) return next;
          const eventIds = new Set(current.events.map((row) => row.id));
          const ips = new Set(current.clients.map((row) => row.client_ip));
          return { pagination: next.pagination,
            events: [...current.events, ...next.events.filter((row) => !eventIds.has(row.id))],
            clients: [...current.clients, ...next.clients.filter((row) => !ips.has(row.client_ip))] };
        });
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : texts.detailsFailed);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [kind, range, until, page, retry]);
  const isClients = kind === 'anomalous';
  const loaded = data ? (isClients ? data.clients.length : data.events.length) : 0;
  return <section ref={panel} id="api-monitor-details" tabIndex={-1} aria-label={`${detailLabels[kind]} · ${texts.details}`}
    className="min-w-0 space-y-3 rounded-lg border border-[#247560] bg-[#f4f7f4] p-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#247560]">
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold">{detailLabels[kind]} · {texts.details}</h3>
      <button type="button" className={buttonClass} onClick={onClose}><X size={14} />{texts.closeDetails}</button>
    </div>
    <p className="text-xs text-[#66746b]">{time(report.since)} – {time(until)} · {isClients ? texts.normalHint : texts.detailsHint}</p>
    {loading && <p role="status" className="text-sm text-[#66746b]">{texts.loadingMore}</p>}
    {error && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-red-800">
      <p>{error}</p>{error !== texts.snapshotExpired && <button type="button" className={buttonClass} onClick={() => setRetry((value) => value + 1)}>{texts.retryDetails}</button>}
    </div>}
    {data && <MonitorTable wide title={detailLabels[kind]} empty={!loaded}
      columns={isClients ? [texts.ip, texts.signals, texts.requests, texts.downloads, texts.targets, texts.errors, texts.time]
        : [texts.time, texts.endpoint, texts.ip, texts.country, texts.source, texts.userAgent, texts.status, texts.duration]}
      footer={<div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e9e4] p-4" aria-busy={loading}>
        <p role="status" className="text-xs text-[#66746b]">{texts.loadedDetails.replace('{loaded}', count(loaded)).replace('{total}', count(data.pagination.total))}</p>
        {data.pagination.has_more && <button type="button" className={buttonClass} disabled={loading || !!error} onClick={() => setPage(data.pagination.page + 1)}>{texts.loadMoreDetails}</button>}
      </div>}>
      {isClients ? data.clients.map((row) => <tr key={row.client_ip} className="bg-amber-50/60">
        <td className="font-mono">{row.client_ip}</td><td><ClientSignals row={row} thresholds={report.thresholds} /></td>
        <td>{count(row.requests)}</td><td>{count(row.downloads)}</td><td>{count(row.targets)}</td><td>{count(row.errors)}</td>
        <td className="whitespace-nowrap">{time(row.last_seen)}</td>
      </tr>) : data.events.map((row) => <tr key={row.id} className={row.status >= 400 ? 'bg-red-50/50' : ''}>
        <td className="whitespace-nowrap">{time(row.created_at)}</td><td className="break-all font-mono">{row.method} {row.endpoint}</td>
        <td className="font-mono">{row.client_ip || texts.unknown}</td><td>{row.country || texts.unknown}</td>
        <td><p className="whitespace-nowrap">{sourceLabels[row.source]}</p><p className="mt-1 break-all text-[#758278]">{row.source_host || '—'}</p>
          {row.mini_app_id && <p className="mt-1 break-all font-mono">{row.mini_app_id}</p>}</td>
        <td><span className="block w-44 break-all text-[#66746b]">{row.user_agent || texts.unknown}</span></td>
        <td className={row.status >= 400 ? 'font-medium text-red-700' : ''}>{row.status}</td><td className="whitespace-nowrap">{row.duration_ms} ms</td>
      </tr>)}
    </MonitorTable>}
  </section>;
}

type Payload = { data: ApiMonitorReport; enabled: boolean; miniAppId: string | null };

export default function AdminApiMonitorPanel({ refreshKey }: { refreshKey: number }) {
  const [range, setRange] = useState<ApiMonitorRange>('24h');
  const [revision, setRevision] = useState(0);
  const [detail, setDetail] = useState<ApiMonitorDetailKind | null>(null);
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState('');
  const requestEpoch = useRef(0);
  const moreController = useRef<AbortController | null>(null);
  const morePending = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const epoch = ++requestEpoch.current;
    moreController.current?.abort(); morePending.current = false;
    setLoadingMore(false); setMoreError(''); setDetail(null);
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
    return () => { controller.abort(); moreController.current?.abort(); requestEpoch.current = epoch + 1; };
  }, [range, revision, refreshKey]);

  const loadMore = async () => {
    if (!payload || payload.data.range !== range || loading || morePending.current || !payload.data.client_pagination.has_more) return;
    const epoch = requestEpoch.current;
    const snapshot = payload.data;
    const controller = new AbortController();
    moreController.current = controller; morePending.current = true;
    setLoadingMore(true); setMoreError('');
    try {
      const query = new URLSearchParams({ range: snapshot.range, view: 'clients',
        page: String(snapshot.client_pagination.page + 1), until: String(snapshot.until) });
      const response = await fetch(`/api/admin/api-monitor?${query}`, {
        credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      });
      const result = await response.json() as { data?: ApiMonitorClientsPage; error?: string };
      if (!response.ok || !result.data) throw new Error(result.error === 'SNAPSHOT_EXPIRED' ? texts.snapshotExpired : texts.moreFailed);
      const next = result.data;
      if (controller.signal.aborted || epoch !== requestEpoch.current) return;
      setPayload((current) => {
        if (!current || current.data.until !== snapshot.until || current.data.range !== snapshot.range) return current;
        const seen = new Set(current.data.clients.map((client) => client.client_ip));
        return { ...current, data: { ...current.data,
          clients: [...current.data.clients, ...next.clients.filter((client) => !seen.has(client.client_ip))],
          client_pagination: next.pagination } };
      });
    } catch (cause) {
      if (!controller.signal.aborted && epoch === requestEpoch.current) {
        setMoreError(cause instanceof Error && cause.message === texts.snapshotExpired ? texts.snapshotExpired : texts.moreFailed);
      }
    } finally {
      if (epoch === requestEpoch.current) { morePending.current = false; setLoadingMore(false); }
    }
  };

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
          { label: texts.requests, value: count(report.summary.requests) },
          { label: texts.clients, value: count(report.summary.clients) },
          { label: texts.downloads, value: count(report.summary.downloads) },
          { label: texts.errors, value: count(report.summary.errors), kind: 'errors' },
          { label: texts.external, value: count(report.summary.external), kind: 'external' },
          { label: texts.anomalousClients, value: count(report.summary.anomalous_clients), kind: 'anomalous' },
          { label: texts.avgLatency, value: `${report.summary.avg_ms} ms` },
        ] as { label: string; value: string; kind?: ApiMonitorDetailKind }[]).map(({ label, value, kind }) => {
          const className = `rounded-lg border p-4 text-left ${kind === 'anomalous' && report.summary.anomalous_clients > 0
            ? 'border-amber-300 bg-amber-50 text-amber-950' : kind === 'errors' && report.summary.errors > 0
              ? 'border-red-300 bg-red-50 text-red-900' : 'border-[#dfe6df] bg-white'}`;
          const content = <><span className="flex items-center justify-between gap-2 text-xs text-[#66746b]">{label}
            {kind && <ArrowUpRight size={14} aria-hidden="true" />}</span><span className="mt-2 block text-2xl font-semibold tabular-nums tracking-tight">{value}</span></>;
          return kind ? <button key={label} id={`api-monitor-${kind}`} type="button" aria-label={`${label} · ${texts.viewDetails}`}
            aria-expanded={detail === kind} aria-controls={detail === kind ? 'api-monitor-details' : undefined}
            onClick={() => setDetail(kind)} className={`${className} cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#247560] ${detail === kind ? 'ring-2 ring-[#247560]' : ''}`}>{content}</button>
            : <div key={label} className={className}>{content}</div>;
        })}
      </div>
      {detail && <MonitorDetails key={`${detail}:${report.until}`} kind={detail} report={report} onClose={() => {
        setDetail(null); document.getElementById(`api-monitor-${detail}`)?.focus();
      }} />}
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
          {report.alerts.map((row) => <tr key={`${row.client_ip}:${row.minute}`} className="bg-amber-50/60">
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
      <MonitorTable wide title={texts.topClients} columns={[texts.ip, texts.signals, texts.requests, texts.downloads, texts.targets, texts.errors, texts.time]} empty={!report.clients.length}
        footer={<div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e3e9e4] p-4" aria-busy={loadingMore}>
          <p role="status" className="text-xs tabular-nums text-[#66746b]">{texts.loadedClients.replace('{loaded}', count(report.clients.length))
            .replace('{total}', count(report.client_pagination.total))}</p>
          {report.client_pagination.has_more ? <button className={buttonClass} disabled={loadingMore || moreError === texts.snapshotExpired} onClick={() => void loadMore()}>
            {loadingMore ? texts.loadingMore : texts.loadMore}</button> : <span className="text-xs text-[#66746b]">{texts.allLoaded}</span>}
          {moreError && <div role="alert" className="flex w-full flex-wrap items-center gap-3 text-sm text-red-800"><p>{moreError}</p>
            {moreError === texts.snapshotExpired && <button className={buttonClass} onClick={() => setRevision((value) => value + 1)}>{texts.refresh}</button>}</div>}
        </div>}>
        {report.clients.map((row) => <tr key={row.client_ip} className={row.alert_minutes > 0 ? 'bg-amber-50/60' : row.errors > 0 ? 'bg-red-50/50' : ''}>
          <td className="font-mono">{row.client_ip}</td><td><ClientSignals row={row} thresholds={report.thresholds} /></td><td>{count(row.requests)}</td>
          <td>{count(row.downloads)}</td><td>{count(row.targets)}</td><td className={row.errors ? 'font-semibold text-red-700' : ''}>{count(row.errors)}</td>
          <td className="whitespace-nowrap">{time(row.last_seen)}</td></tr>)}
      </MonitorTable>
      <MonitorTable wide title={texts.recent} columns={[texts.time, texts.endpoint, texts.ip, texts.country, texts.source, texts.userAgent, texts.status, texts.duration]} empty={!report.recent.length}>
        {report.recent.map((row) => <tr key={row.id} className={row.status >= 400 ? 'bg-red-50/50' : ''}>
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
