-- A device's overall visual style is independent of wallpaper light/dark variants.
ALTER TABLE w_devices ADD COLUMN theme TEXT
  CHECK (theme IS NULL OR (typeof(theme) = 'text' AND length(trim(theme)) BETWEEN 1 AND 40 AND theme = trim(theme)));
