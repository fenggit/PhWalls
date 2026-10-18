import 'server-only';
import type { ApiAccessEvent, ApiMonitorRange, ApiMonitorReport } from '@/lib/api-monitor-types';

const RANGES = { '1h': 3600000, '24h': 86400000, '7d': 604800000 };
const THRESHOLDS = { requests: 120, downloads: 20, targets: 60 };
const DOWNLOAD = "endpoint IN ('/api/files/download','/api/public/wallpaper-download')";

export async function loadApiMonitorReport(db: D1Database, range: string, now = Date.now()): Promise<ApiMonitorReport> {
  if (!Object.prototype.hasOwnProperty.call(RANGES, range)) throw new Error('Invalid monitor range');
  const selected = range as ApiMonitorRange;
  const since = now - RANGES[selected];
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
    statement(`SELECT client_ip,COUNT(*) AS requests,SUM(${DOWNLOAD}) AS downloads,SUM(status >= 400) AS errors,
      COUNT(DISTINCT target_hash) AS targets,MAX(created_at) AS last_seen FROM w_api_access_events
      WHERE ${where} AND client_ip IS NOT NULL GROUP BY client_ip ORDER BY requests DESC,client_ip LIMIT 20`),
    statement(`SELECT client_ip,CAST(created_at / 60000 AS INTEGER) * 60000 AS minute,
      COUNT(*) AS requests,SUM(${DOWNLOAD}) AS downloads,COUNT(DISTINCT target_hash) AS targets
      FROM w_api_access_events WHERE ${where} AND client_ip IS NOT NULL
      GROUP BY client_ip,minute HAVING requests >= ${THRESHOLDS.requests} OR downloads >= ${THRESHOLDS.downloads}
        OR targets >= ${THRESHOLDS.targets} ORDER BY minute DESC,requests DESC,client_ip LIMIT 30`),
    statement(`SELECT * FROM w_api_access_events WHERE ${where} ORDER BY created_at DESC,id LIMIT 50`),
  ]);
  if (results.some((result) => !result.success)) throw new Error('Monitor query unavailable');
  const [summary, trend, endpoints, sources, clients, alerts, recent] = results;
  const report: ApiMonitorReport = {
    range: selected, since, until: now, bucket_ms: bucketMs,
    summary: summary.results[0] as ApiMonitorReport['summary'],
    trend: trend.results as ApiMonitorReport['trend'], endpoints: endpoints.results as ApiMonitorReport['endpoints'],
    sources: sources.results as ApiMonitorReport['sources'], clients: clients.results as ApiMonitorReport['clients'],
    alerts: alerts.results as ApiMonitorReport['alerts'], recent: recent.results as ApiAccessEvent[], thresholds: THRESHOLDS,
  };
  // Include empty buckets, so low traffic does not look like a continuous plateau.
  const counts = new Map(report.trend.map((row) => [row.bucket, row]));
  report.trend = [];
  for (let bucket = Math.floor(since / bucketMs) * bucketMs; bucket <= now; bucket += bucketMs) {
    report.trend.push(counts.get(bucket) || { bucket, requests: 0, errors: 0 });
  }
  return report;
}
