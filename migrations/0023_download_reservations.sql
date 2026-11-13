-- Separate in-flight reservations from successfully completed downloads.
CREATE TABLE w_download_reservations (
  id TEXT PRIMARY KEY NOT NULL,
  day TEXT NOT NULL,
  ip TEXT NOT NULL
);
CREATE INDEX idx_download_reservations_day_ip ON w_download_reservations(day, ip);
