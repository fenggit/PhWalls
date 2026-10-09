-- Keep the static table compatible with already deployed readers/writers.
-- Live names, SEO titles and descriptions are stored independently.
CREATE TABLE w_live_device_i18n (
  id TEXT NOT NULL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES w_devices(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('en', 'zh', 'ja', 'vi', 'zh-hant')),
  display_name TEXT CHECK (display_name IS NULL OR (length(trim(display_name)) > 0 AND length(display_name) <= 200)),
  seo_title TEXT CHECK (seo_title IS NULL OR (length(trim(seo_title)) > 0 AND length(seo_title) <= 200)),
  description TEXT CHECK (description IS NULL OR (length(trim(description)) > 0 AND length(description) <= 5000)),
  create_date INTEGER NOT NULL,
  updated_date INTEGER NOT NULL,
  UNIQUE (device_id, language),
  CHECK (display_name IS NOT NULL OR seo_title IS NOT NULL OR description IS NOT NULL)
);
CREATE VIEW w_collection_i18n AS
  SELECT id, device_id, 'static' AS media_type, language, display_name, seo_title, description, create_date, updated_date
    FROM w_device_i18n
  UNION ALL
  SELECT id, device_id, 'dynamic' AS media_type, language, display_name, seo_title, description, create_date, updated_date
    FROM w_live_device_i18n;

-- Rebuild to replace the old device/name uniqueness constraint without touching file keys.
CREATE TABLE w_wallpapers_scoped (
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
  deletion_state TEXT NOT NULL DEFAULT 'none' CHECK (deletion_state IN ('none', 'processing', 'pending')),
  UNIQUE (device_id, media_type, name)
);
INSERT INTO w_wallpapers_scoped
  (id,device_id,name,mime_type,size_bytes,origin_key,compress_key,width,height,file_format,theme,media_type,
   category,is_primary,tags,status,create_date,updated_date,deletion_state)
SELECT id,device_id,name,mime_type,size_bytes,origin_key,compress_key,width,height,file_format,theme,media_type,
  category,is_primary,tags,status,create_date,updated_date,deletion_state FROM w_wallpapers;
DROP TABLE w_wallpapers;
ALTER TABLE w_wallpapers_scoped RENAME TO w_wallpapers;
CREATE INDEX idx_w_wallpapers_public ON w_wallpapers(device_id, status, category);
CREATE UNIQUE INDEX idx_w_wallpapers_primary ON w_wallpapers(device_id, category, media_type) WHERE is_primary = 1;
CREATE INDEX idx_w_wallpapers_public_order ON w_wallpapers(device_id, status, is_primary DESC, create_date ASC, name ASC);
CREATE INDEX idx_w_wallpapers_origin_visibility ON w_wallpapers(origin_key, status);
CREATE INDEX idx_w_wallpapers_compress_visibility ON w_wallpapers(compress_key, status);
CREATE TRIGGER prevent_deleted_wallpaper_file_insert
BEFORE INSERT ON w_wallpapers
WHEN EXISTS (SELECT 1 FROM w_deleted_wallpaper_files WHERE object_key = NEW.origin_key OR object_key = NEW.compress_key)
BEGIN SELECT RAISE(ABORT, 'wallpaper_file_deleted'); END;
CREATE TRIGGER prevent_deleted_wallpaper_file_update
BEFORE UPDATE OF origin_key, compress_key ON w_wallpapers
WHEN EXISTS (SELECT 1 FROM w_deleted_wallpaper_files WHERE object_key = NEW.origin_key OR object_key = NEW.compress_key)
BEGIN SELECT RAISE(ABORT, 'wallpaper_file_deleted'); END;
