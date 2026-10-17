-- D1/SQLite uses TEXT plus validation triggers for an extensible enum.
-- 0015 is already applied in production; retain its nullable column and data.
CREATE TRIGGER validate_device_theme_insert
BEFORE INSERT ON w_devices
WHEN NEW.theme IS NOT NULL AND NEW.theme NOT IN (
  'dark', 'gradient', 'minimal_geometric', 'anime', 'abstract',
  'nature', 'photography', 'floral', 'technology', 'illustration'
)
BEGIN SELECT RAISE(ABORT, 'invalid_device_theme'); END;

CREATE TRIGGER validate_device_theme_update
BEFORE UPDATE OF theme ON w_devices
WHEN NEW.theme IS NOT NULL AND NEW.theme NOT IN (
  'dark', 'gradient', 'minimal_geometric', 'anime', 'abstract',
  'nature', 'photography', 'floral', 'technology', 'illustration'
)
BEGIN SELECT RAISE(ABORT, 'invalid_device_theme'); END;
