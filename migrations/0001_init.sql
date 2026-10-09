-- First migration: creates the two tables from the spec.
-- A migration is a numbered SQL file. Wrangler remembers which ones it has
-- already run, so each one runs exactly once per database.

CREATE TABLE sets (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  slug           TEXT NOT NULL UNIQUE,          -- used in the URL, e.g. /sets/tokyo-nights
  title          TEXT NOT NULL,
  description    TEXT NOT NULL DEFAULT '',
  cover_photo_id INTEGER,                       -- which photo to show on the home page
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE photos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  set_id      INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  thumb_key   TEXT NOT NULL,                    -- R2 key of the ~500 px thumbnail
  display_key TEXT NOT NULL,                    -- R2 key of the ~2000 px display version
  width       INTEGER NOT NULL,                 -- size of the display version, in pixels
  height      INTEGER NOT NULL,
  caption     TEXT NOT NULL DEFAULT '',
  alt_text    TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  size_bytes  INTEGER NOT NULL DEFAULT 0,       -- thumb + display, for the storage readout
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Makes "get all photos in a set, in order" fast.
CREATE INDEX idx_photos_set_order ON photos(set_id, sort_order);
