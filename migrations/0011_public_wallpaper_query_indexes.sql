-- 公开品牌列表、合集封面排序及下载权限检查；不改动已有记录。
CREATE INDEX IF NOT EXISTS idx_w_devices_public_listing
  ON w_devices(brand_name, status, release_date DESC, device_name);
CREATE INDEX IF NOT EXISTS idx_w_wallpapers_public_order
  ON w_wallpapers(device_id, status, is_primary DESC, create_date ASC, name ASC);
CREATE INDEX IF NOT EXISTS idx_w_wallpapers_origin_visibility
  ON w_wallpapers(origin_key, status);
CREATE INDEX IF NOT EXISTS idx_w_wallpapers_compress_visibility
  ON w_wallpapers(compress_key, status);
