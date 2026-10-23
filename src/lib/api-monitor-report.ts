import 'server-only';
import type { ApiAccessEvent, ApiMonitorRange, ApiMonitorReport, ApiClientPagination, ApiMonitorClient, ApiMonitorClientsPage } from '@/lib/api-monitor-types';

const RANGES = { '1h': 3600000, '24h': 86400000, '7d': 604800000 };
const THRESHOLDS = { requests: 120, downloads: 20, targets: 60 };
const DOWNLOAD = "endpoint IN ('/api/files/download','/api/public/wallpaper-download')";
const CLIENT_PAGE_SIZE = 20;
const SNAPSHOT_MAX_AGE = 15 * 60000;
const TIME_WINDOW = 'created_at >= ? AND created_at <= ?';
const MINUTE_COUNTS = `SELECT client_ip,CAST(created_at / 60000 AS INTEGER) * 60000 AS minute,
  COUNT(*) AS requests,SUM(${DOWNLOAD}) AS downloads,COUNT(DISTINCT target_hash) AS targets
  FROM w_api_access_events WHERE ${TIME_WINDOW} AND client_ip IS NOT NULL GROUP BY client_ip,minute`;
const EXCEEDS_THRESHOLD = `requests >= ${THRESHOLDS.requests} OR downloads >= ${THRESHOLDS.downloads} OR targets >= ${THRESHOLDS.targets}`;

export class ApiMonitorPaginationError extends Error {
  constructor(public code: 'INVALID_PAGINATION' | 'SNAPSHOT_EXPIRED') { super(`Invalid monitor pagination: ${code}`); }
}

function rangeDuration(range: string): number {
  if (!Object.prototype.hasOwnProperty.call(RANGES, range)) throw new Error('Invalid monitor range');
  return RANGES[range as ApiMonitorRange];
}

function pagination(total: number, until: number, page: number): ApiClientPagination {
  return { page, page_size: CLIENT_PAGE_SIZE, total, has_more: page * CLIENT_PAGE_SIZE < total, until };
}

function clientsStatement(db: D1Database, since: number, until: number, page: number): D1PreparedStatement {
  // Only inspect minute peaks for IPs on this page. The IP/time index bounds each join.
  return db.prepare(`WITH ranked AS (
    SELECT client_ip,COUNT(*) AS requests,SUM(${DOWNLOAD}) AS downloads,SUM(status >= 400) AS errors,
      COUNT(DISTINCT target_hash) AS targets,MAX(created_at) AS last_seen
    FROM w_api_access_events WHERE ${TIME_WINDOW} AND client_ip IS NOT NULL
    GROUP BY client_ip ORDER BY requests DESC,client_ip LIMIT ? OFFSET ?
  ), minutes AS (
    SELECT a.client_ip,CAST(a.created_at / 60000 AS INTEGER) AS minute,COUNT(*) AS requests,
      SUM(a.${DOWNLOAD}) AS downloads,COUNT(DISTINCT a.target_hash) AS targets
    FROM ranked r JOIN w_api_access_events a ON a.client_ip=r.client_ip
    WHERE a.created_at >= ? AND a.created_at <= ? GROUP BY a.client_ip,minute
  ) SELECT r.*,MAX(m.requests) AS peak_requests,MAX(m.downloads) AS peak_downloads,
    MAX(m.targets) AS peak_targets,
    SUM(CASE WHEN m.requests >= ${THRESHOLDS.requests} OR m.downloads >= ${THRESHOLDS.downloads}
      OR m.targets >= ${THRESHOLDS.targets} THEN 1 ELSE 0 END) AS alert_minutes
    FROM ranked r JOIN minutes m ON m.client_ip=r.client_ip
    GROUP BY r.client_ip ORDER BY r.requests DESC,r.client_ip`).bind(
    since, until, CLIENT_PAGE_SIZE, (page - 1) * CLIENT_PAGE_SIZE, since, until,
  );
}

export async function loadApiMonitorClients(db: D1Database, range: string, until: number, page = 1): Promise<ApiMonitorClientsPage> {
  const duration = rangeDuration(range);
  const now = Date.now();
  if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(until) || until <= 0 || until > now) {
    throw new ApiMonitorPaginationError('INVALID_PAGINATION');
  }
  if (now - until > SNAPSHOT_MAX_AGE) throw new ApiMonitorPaginationError('SNAPSHOT_EXPIRED');
  const since = Math.max(until - duration, now - RANGES['7d']);
  const results = await db.batch([
    db.prepare(`SELECT COUNT(DISTINCT client_ip) AS total FROM w_api_access_events WHERE ${TIME_WINDOW}`).bind(since, until),
    clientsStatement(db, since, until, page),
  ]);
  if (results.some((result) => !result.success)) throw new Error('Monitor query unavailable');
  const total = (results[0].results[0] as { total: number }).total;
  return { clients: results[1].results as ApiMonitorClient[], pagination: pagination(total, until, page) };
}

export async function loadApiMonitorReport(db: D1Database, range: string, now = Date.now()): Promise<ApiMonitorReport> {
  const duration = rangeDuration(range);
  const selected = range as ApiMonitorRange;
  const since = now - duration;
  const bucketMs = selected === '1h' ? 300000 : selected === '24h' ? 3600000 : 21600000;
  const where = 'created_at >= ? AND created_at <= ?';
  const statement = (sql: string) => db.prepare(sql).bind(since, now);
  const results = await db.batch([
    statement(`SELECT COUNT(*) AS requests, COUNT(DISTINCT client_ip) AS clients,
      COALESCE(SUM(status >= 400),0) AS errors, COALESCE(SUM(${DOWNLOAD}),0) AS downloads,
      COALESCE(ROUND(AVG(duration_ms),2),0) AS avg_ms, COALESCE(SUM(source='external'),0) AS external
      FROM w_api_access_events WHERE ${where}`),
    statement(`SELECT CAST(created_at / ${bucketMs} AS INTEGER) * ${bucketMs} AS bucket,
      COUNT(*) AS requests, SUM(status >= 400) AS errors FROM w_api_access_events
      WHERE ${where} GROUP BY bucket ORDER BY bucket`),
    statement(`SELECT endpoint, COUNT(*) AS requests, SUM(status >= 400) AS errors, ROUND(AVG(duration_ms),2) AS avg_ms
      FROM w_api_access_events WHERE ${where} GROUP BY endpoint ORDER BY requests DESC, endpoint LIMIT 20`),
    statement(`SELECT source,source_host,mini_app_id,COUNT(*) AS requests FROM w_api_access_events
      WHERE ${where} GROUP BY source,source_host,mini_app_id ORDER BY requests DESC,source,source_host LIMIT 30`),
    clientsStatement(db, since, now, 1),
    statement(`WITH minutes AS (${MINUTE_COUNTS}) SELECT * FROM minutes WHERE ${EXCEEDS_THRESHOLD}
      ORDER BY minute DESC,requests DESC,client_ip LIMIT 30`),
    statement(`SELECT * FROM w_api_access_events WHERE ${where} ORDER BY created_at DESC,id LIMIT 50`),
    statement(`WITH minutes AS (${MINUTE_COUNTS}) SELECT COUNT(DISTINCT client_ip) AS anomalous_clients
      FROM minutes WHERE ${EXCEEDS_THRESHOLD}`),
  ]);
  if (results.some((result) => !result.success)) throw new Error('Monitor query unavailable');
  const [summary, trend, endpoints, sources, clients, alerts, recent, anomalous] = results;
  const totals: ApiMonitorReport['summary'] = {
    ...(summary.results[0] as Omit<ApiMonitorReport['summary'], 'anomalous_clients'>),
    anomalous_clients: (anomalous.results[0] as { anomalous_clients: number }).anomalous_clients,
  };
  const report: ApiMonitorReport = {
    range: selected, since, until: now, bucket_ms: bucketMs,
    summary: totals,
    trend: trend.results as ApiMonitorReport['trend'], endpoints: endpoints.results as ApiMonitorReport['endpoints'],
    sources: sources.results as ApiMonitorReport['sources'], clients: clients.results as ApiMonitorReport['clients'],
    alerts: alerts.results as ApiMonitorReport['alerts'], recent: recent.results as ApiAccessEvent[], thresholds: THRESHOLDS,
    client_pagination: pagination(totals.clients, now, 1),
  };
  // Include empty buckets, so low traffic does not look like a continuous plateau.
  const counts = new Map(report.trend.map((row) => [row.bucket, row]));
  report.trend = [];
  for (let bucket = Math.floor(since / bucketMs) * bucketMs; bucket <= now; bucket += bucketMs) {
    report.trend.push(counts.get(bucket) || { bucket, requests: 0, errors: 0 });
  }
  return report;
}
