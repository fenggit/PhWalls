CREATE TABLE w_device_desc (
  id TEXT NOT NULL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES w_devices(id) ON DELETE CASCADE,
  "desc" TEXT NOT NULL CHECK (length(trim("desc")) > 0 AND length("desc") <= 5000),
  language TEXT NOT NULL CHECK (language IN ('en', 'zh', 'ja', 'vi', 'zh-hant')),
  create_date INTEGER NOT NULL,
  updated_date INTEGER NOT NULL,
  UNIQUE (device_id, language)
);
