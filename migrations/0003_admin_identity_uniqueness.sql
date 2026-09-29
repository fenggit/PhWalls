CREATE UNIQUE INDEX IF NOT EXISTS idx_w_brands_title_unique
  ON w_brands(LOWER(TRIM(title)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_w_devices_name_unique_nocase
  ON w_devices(brand_name, LOWER(TRIM(device_name)));
