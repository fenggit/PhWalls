-- Manual exact-address blocks, independent of telemetry retention.
CREATE TABLE w_api_ip_blocklist (
  ip TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL CHECK (created_at >= 0)
);
CREATE INDEX idx_api_ip_blocklist_created ON w_api_ip_blocklist(created_at DESC, ip);
