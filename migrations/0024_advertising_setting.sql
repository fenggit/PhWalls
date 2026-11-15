-- Advertisements are enabled by default for all existing and new installations.
ALTER TABLE w_download_settings
  ADD COLUMN ads_enabled INTEGER NOT NULL DEFAULT 1 CHECK (ads_enabled IN (0, 1));
