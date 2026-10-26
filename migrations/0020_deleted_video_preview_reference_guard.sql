-- Video preview keys are derived rather than stored. Retired preview objects
-- must not be reintroduced by raw record writes, imports or media changes.
CREATE TRIGGER prevent_deleted_wallpaper_preview_insert
BEFORE INSERT ON w_wallpapers
WHEN NEW.media_type = 'dynamic' AND EXISTS (
  SELECT 1 FROM w_deleted_wallpaper_files
  WHERE object_key = REPLACE(NEW.origin_key, '/origin/', '/preview/'))
BEGIN SELECT RAISE(ABORT, 'wallpaper_preview_file_deleted'); END;

CREATE TRIGGER prevent_deleted_wallpaper_preview_update
BEFORE UPDATE OF origin_key, media_type ON w_wallpapers
WHEN NEW.media_type = 'dynamic' AND EXISTS (
  SELECT 1 FROM w_deleted_wallpaper_files
  WHERE object_key = REPLACE(NEW.origin_key, '/origin/', '/preview/'))
BEGIN SELECT RAISE(ABORT, 'wallpaper_preview_file_deleted'); END;
