CREATE TABLE IF NOT EXISTS w_devices (
  id TEXT PRIMARY KEY,
  brand_logo TEXT,
  brand_name TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_slug TEXT NOT NULL,
  device_category TEXT NOT NULL CHECK (device_category IN ('phone', 'phone_fold', 'pad', 'desktop', 'os')),
  is_popular_brand INTEGER NOT NULL DEFAULT 0 CHECK (is_popular_brand IN (0, 1)),
  device_splash_url TEXT,
  release_date TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished')),
  create_date INTEGER NOT NULL,
  updated_date INTEGER NOT NULL,
  UNIQUE (brand_name, device_name),
  UNIQUE (brand_name, device_slug)
);

CREATE TABLE IF NOT EXISTS w_wallpapers (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES w_devices(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  origin_key TEXT NOT NULL,
  compress_key TEXT,
  width INTEGER CHECK (width IS NULL OR width > 0),
  height INTEGER CHECK (height IS NULL OR height > 0),
  file_format TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT 'normal' CHECK (theme IN ('dark', 'light', 'normal')),
  media_type TEXT NOT NULL CHECK (media_type IN ('static', 'dynamic')),
  category TEXT NOT NULL CHECK (category IN ('phone', 'phone_fold', 'pad', 'desktop', 'os')),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  tags TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(tags) AND json_type(tags) = 'array'),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'unpublished')),
  create_date INTEGER NOT NULL,
  updated_date INTEGER NOT NULL,
  UNIQUE (device_id, name)
);

CREATE INDEX IF NOT EXISTS idx_w_devices_public ON w_devices(brand_name, device_category, status);
CREATE INDEX IF NOT EXISTS idx_w_wallpapers_public ON w_wallpapers(device_id, status, category);
CREATE UNIQUE INDEX IF NOT EXISTS idx_w_wallpapers_primary ON w_wallpapers(device_id, category) WHERE is_primary = 1;
