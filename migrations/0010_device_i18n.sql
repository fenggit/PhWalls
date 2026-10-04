CREATE TABLE w_device_i18n (
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

-- Preserve authored SEO copy; it is not a localized device name.
INSERT INTO w_device_i18n (id, device_id, language, display_name, seo_title, description, create_date, updated_date)
SELECT id, device_id, language, NULL, name, "desc", create_date, updated_date
FROM w_device_desc;

DROP TABLE w_device_desc;
