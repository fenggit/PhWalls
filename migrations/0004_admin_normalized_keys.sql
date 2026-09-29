ALTER TABLE w_brands ADD COLUMN title_key TEXT;
ALTER TABLE w_devices ADD COLUMN name_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_w_brands_title_key
  ON w_brands(title_key) WHERE title_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_w_devices_brand_name_key
  ON w_devices(brand_name, name_key) WHERE name_key IS NOT NULL;
