export type ApiSource = 'site' | 'own_mini' | 'wechat' | 'external' | 'unknown';
export type ApiMonitorRange = '1h' | '24h' | '7d';
export type ApiAccessEvent = {
  id: string;
  created_at: number;
  endpoint: string;
  method: string;
  status: number;
  duration_ms: number;
  client_ip: string | null;
  country: string | null;
  source: ApiSource;
  source_host: string | null;
  mini_app_id: string | null;
  user_agent: string;
  target_hash: string | null;
};

export type ApiMonitorClient = {
  client_ip: string; requests: number; downloads: number; errors: number; targets: number; last_seen: number;
  peak_requests: number; peak_downloads: number; peak_targets: number; alert_minutes: number;
};
export type ApiClientPagination = { page: number; page_size: number; total: number; has_more: boolean; until: number };
export type ApiMonitorClientsPage = { clients: ApiMonitorClient[]; pagination: ApiClientPagination };

export type ApiMonitorReport = {
  range: ApiMonitorRange;
  since: number;
  until: number;
  bucket_ms: number;
  summary: { requests: number; clients: number; errors: number; downloads: number; avg_ms: number; external: number; anomalous_clients: number };
  trend: { bucket: number; requests: number; errors: number }[];
  endpoints: { endpoint: string; requests: number; errors: number; avg_ms: number }[];
  sources: { source: ApiSource; source_host: string | null; mini_app_id: string | null; requests: number }[];
  clients: ApiMonitorClient[];
  client_pagination: ApiClientPagination;
  alerts: { client_ip: string; minute: number; requests: number; downloads: number; targets: number }[];
  recent: ApiAccessEvent[];
  thresholds: { requests: number; downloads: number; targets: number };
};
