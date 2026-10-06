CREATE TABLE IF NOT EXISTS w_brands (
  slug TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('mobile', 'desktop')),
  create_date INTEGER NOT NULL,
  updated_date INTEGER NOT NULL
);
