CREATE TABLE IF NOT EXISTS w_deleted_wallpaper_files (
  object_key TEXT PRIMARY KEY,
  deleted_at INTEGER NOT NULL
);

-- 删除完成后仍保留 key，阻止已通过 R2 HEAD 的迟到写入重新引用旧文件。
CREATE TRIGGER IF NOT EXISTS prevent_deleted_wallpaper_file_insert
BEFORE INSERT ON w_wallpapers
WHEN EXISTS (SELECT 1 FROM w_deleted_wallpaper_files
  WHERE object_key = NEW.origin_key OR object_key = NEW.compress_key)
BEGIN
  SELECT RAISE(ABORT, 'wallpaper_file_deleted');
END;

CREATE TRIGGER IF NOT EXISTS prevent_deleted_wallpaper_file_update
BEFORE UPDATE OF origin_key, compress_key ON w_wallpapers
WHEN EXISTS (SELECT 1 FROM w_deleted_wallpaper_files
  WHERE object_key = NEW.origin_key OR object_key = NEW.compress_key)
BEGIN
  SELECT RAISE(ABORT, 'wallpaper_file_deleted');
END;
