CREATE TABLE w_device_desc_with_name (
  id TEXT NOT NULL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES w_devices(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0 AND length(name) <= 200),
  "desc" TEXT NOT NULL CHECK (length(trim("desc")) > 0 AND length("desc") <= 5000),
  language TEXT NOT NULL CHECK (language IN ('en', 'zh', 'ja', 'vi', 'zh-hant')),
  create_date INTEGER NOT NULL,
  updated_date INTEGER NOT NULL,
  UNIQUE (device_id, language)
);

INSERT INTO w_device_desc_with_name (id, device_id, name, "desc", language, create_date, updated_date)
SELECT description.id, description.device_id, device.device_name, description."desc", description.language,
  description.create_date, description.updated_date
FROM w_device_desc description JOIN w_devices device ON device.id = description.device_id;

DROP TABLE w_device_desc;
ALTER TABLE w_device_desc_with_name RENAME TO w_device_desc;
