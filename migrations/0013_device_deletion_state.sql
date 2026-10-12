ALTER TABLE w_devices ADD COLUMN deletion_state TEXT NOT NULL DEFAULT 'none'
  CHECK (deletion_state IN ('none', 'processing', 'pending'));

CREATE TRIGGER prevent_deleting_device_wallpaper_insert
BEFORE INSERT ON w_wallpapers
WHEN EXISTS (SELECT 1 FROM w_devices WHERE id = NEW.device_id AND deletion_state != 'none')
BEGIN
  SELECT RAISE(ABORT, 'device_deletion_in_progress');
END;

CREATE TRIGGER prevent_deleting_device_wallpaper_update
BEFORE UPDATE ON w_wallpapers
WHEN NEW.deletion_state = 'none' AND EXISTS (
  SELECT 1 FROM w_devices WHERE id IN (OLD.device_id, NEW.device_id) AND deletion_state != 'none')
BEGIN
  SELECT RAISE(ABORT, 'device_deletion_in_progress');
END;

CREATE TRIGGER prevent_deleting_device_republish
BEFORE UPDATE ON w_devices
WHEN OLD.deletion_state != 'none' AND (NEW.deletion_state = 'none' OR NEW.status != 'unpublished')
BEGIN
  SELECT RAISE(ABORT, 'device_deletion_in_progress');
END;
