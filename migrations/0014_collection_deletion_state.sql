-- A device can keep serving one collection while the other is being deleted.
CREATE TABLE w_collection_deletions (
  device_id TEXT NOT NULL REFERENCES w_devices(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('static', 'dynamic')),
  deletion_state TEXT NOT NULL CHECK (deletion_state IN ('processing', 'pending')),
  updated_date INTEGER NOT NULL,
  lease_token TEXT NOT NULL,
  PRIMARY KEY (device_id, media_type)
);

CREATE TRIGGER prevent_deleting_collection_wallpaper_insert
BEFORE INSERT ON w_wallpapers
WHEN EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id = NEW.device_id AND media_type = NEW.media_type)
BEGIN SELECT RAISE(ABORT, 'collection_deletion_in_progress'); END;

CREATE TRIGGER prevent_deleting_collection_wallpaper_update
BEFORE UPDATE ON w_wallpapers
WHEN NEW.deletion_state = 'none' AND EXISTS (SELECT 1 FROM w_collection_deletions
  WHERE (device_id = OLD.device_id AND media_type = OLD.media_type)
     OR (device_id = NEW.device_id AND media_type = NEW.media_type))
BEGIN SELECT RAISE(ABORT, 'collection_deletion_in_progress'); END;

CREATE TRIGGER prevent_deleting_collection_device_update
BEFORE UPDATE ON w_devices
WHEN EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id = OLD.id)
BEGIN SELECT RAISE(ABORT, 'collection_deletion_in_progress'); END;

CREATE TRIGGER prevent_deleting_static_collection_i18n_insert
BEFORE INSERT ON w_device_i18n
WHEN EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id = NEW.device_id AND media_type = 'static')
  OR EXISTS (SELECT 1 FROM w_devices WHERE id = NEW.device_id AND deletion_state != 'none')
BEGIN SELECT RAISE(ABORT, 'collection_deletion_in_progress'); END;

CREATE TRIGGER prevent_deleting_static_collection_i18n_update
BEFORE UPDATE ON w_device_i18n
WHEN EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id IN (OLD.device_id, NEW.device_id) AND media_type = 'static')
  OR EXISTS (SELECT 1 FROM w_devices WHERE id IN (OLD.device_id, NEW.device_id) AND deletion_state != 'none')
BEGIN SELECT RAISE(ABORT, 'collection_deletion_in_progress'); END;

CREATE TRIGGER prevent_deleting_dynamic_collection_i18n_insert
BEFORE INSERT ON w_live_device_i18n
WHEN EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id = NEW.device_id AND media_type = 'dynamic')
  OR EXISTS (SELECT 1 FROM w_devices WHERE id = NEW.device_id AND deletion_state != 'none')
BEGIN SELECT RAISE(ABORT, 'collection_deletion_in_progress'); END;

CREATE TRIGGER prevent_deleting_dynamic_collection_i18n_update
BEFORE UPDATE ON w_live_device_i18n
WHEN EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id IN (OLD.device_id, NEW.device_id) AND media_type = 'dynamic')
  OR EXISTS (SELECT 1 FROM w_devices WHERE id IN (OLD.device_id, NEW.device_id) AND deletion_state != 'none')
BEGIN SELECT RAISE(ABORT, 'collection_deletion_in_progress'); END;
