CREATE TABLE w_download_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  daily_limit INTEGER DEFAULT NULL CHECK (daily_limit IS NULL OR (typeof(daily_limit) = 'integer' AND daily_limit BETWEEN 0 AND 1000000))
);
INSERT INTO w_download_settings (id, daily_limit) VALUES (1, NULL);
CREATE TABLE w_download_daily_usage (
  day TEXT NOT NULL,
  ip TEXT NOT NULL,
  downloads INTEGER NOT NULL DEFAULT 0 CHECK (downloads >= 0),
  PRIMARY KEY (day, ip)
);
