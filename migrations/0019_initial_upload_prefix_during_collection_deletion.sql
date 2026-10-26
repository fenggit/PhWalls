-- A first upload to the other collection may choose this device's future directory.
-- Existing object keys and every device identity/visibility field remain unchanged.
DROP TRIGGER prevent_deleting_collection_device_update;
CREATE TRIGGER prevent_deleting_collection_device_update
BEFORE UPDATE ON w_devices
WHEN EXISTS (SELECT 1 FROM w_collection_deletions WHERE device_id = OLD.id)
  AND NOT (
    OLD.upload_prefix IS NULL AND NEW.upload_prefix IS NOT NULL
    AND OLD.deletion_state = 'none' AND NEW.deletion_state IS OLD.deletion_state
    AND NEW.updated_date > OLD.updated_date
    AND NEW.id IS OLD.id
    AND NEW.brand_logo IS OLD.brand_logo
    AND NEW.brand_name IS OLD.brand_name
    AND NEW.device_name IS OLD.device_name
    AND NEW.name_key IS OLD.name_key
    AND NEW.device_slug IS OLD.device_slug
    AND NEW.device_category IS OLD.device_category
    AND NEW.theme IS OLD.theme
    AND NEW.is_popular_brand IS OLD.is_popular_brand
    AND NEW.device_splash_url IS OLD.device_splash_url
    AND NEW.release_date IS OLD.release_date
    AND NEW.status IS OLD.status
    AND NEW.create_date IS OLD.create_date
  )
BEGIN SELECT RAISE(ABORT, 'collection_deletion_in_progress'); END;
