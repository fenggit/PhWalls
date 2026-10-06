-- SQLite LOWER only handles ASCII here. Abort instead of writing a key that
-- differs from the application's Unicode and whitespace normalization.
CREATE TABLE _admin_identity_backfill_guard (valid INTEGER NOT NULL CHECK (valid = 1));
INSERT INTO _admin_identity_backfill_guard (valid)
SELECT 0 WHERE EXISTS (
  SELECT 1 FROM w_brands
  WHERE title_key IS NULL AND (title GLOB '*[^ -~]*' OR INSTR(TRIM(title), '  ') > 0)
  UNION ALL
  SELECT 1 FROM w_devices
  WHERE name_key IS NULL AND (device_name GLOB '*[^ -~]*' OR INSTR(TRIM(device_name), '  ') > 0)
);
DROP TABLE _admin_identity_backfill_guard;

UPDATE w_brands SET title_key = LOWER(TRIM(title))
WHERE title_key IS NULL AND title NOT GLOB '*[^ -~]*' AND INSTR(TRIM(title), '  ') = 0;
UPDATE w_devices SET name_key = LOWER(TRIM(device_name))
WHERE name_key IS NULL AND device_name NOT GLOB '*[^ -~]*' AND INSTR(TRIM(device_name), '  ') = 0;
