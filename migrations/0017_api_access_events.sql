-- Observation only: does not change public API authorization or wallpaper data.
CREATE TABLE w_api_access_events (
  id TEXT PRIMARY KEY NOT NULL,
  created_at INTEGER NOT NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status INTEGER NOT NULL CHECK (status BETWEEN 100 AND 599),
  duration_ms REAL NOT NULL CHECK (duration_ms >= 0),
  client_ip TEXT,
  country TEXT,
  source TEXT NOT NULL CHECK (source IN ('site', 'own_mini', 'wechat', 'external', 'unknown')),
  source_host TEXT,
  mini_app_id TEXT,
  user_agent TEXT NOT NULL DEFAULT '' CHECK (length(user_agent) <= 256),
  target_hash TEXT
);
CREATE INDEX idx_api_access_created ON w_api_access_events(created_at);
CREATE INDEX idx_api_access_ip_created ON w_api_access_events(client_ip, created_at);

-- Lazy retention: bounded work per insert, no cron required. No traffic means no cleanup.
CREATE TRIGGER api_access_retention AFTER INSERT ON w_api_access_events
BEGIN
  DELETE FROM w_api_access_events WHERE id IN (
    SELECT id FROM w_api_access_events
    WHERE created_at < NEW.created_at - 604800000
    ORDER BY created_at LIMIT 100
  );
END;
