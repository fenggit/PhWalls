ALTER TABLE w_wallpapers ADD COLUMN deletion_state TEXT NOT NULL DEFAULT 'none'
  CHECK (deletion_state IN ('none', 'processing', 'pending'));
