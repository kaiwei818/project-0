-- Adds licensed downloads and categories. Nothing existing is changed or removed.

-- 1. A private, clean (no watermark) copy of a photo, only for photos you choose.
--    NULL = not downloadable. These files are never served at /img/; only
--    /api/download/... hands them out, and only with a valid license code.
ALTER TABLE photos ADD COLUMN download_key TEXT;

-- 2. License codes. Each code unlocks downloads from chosen sets.
CREATE TABLE license_codes (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT NOT NULL UNIQUE,          -- e.g. "WL-7K3F-Q9XM"
  label         TEXT NOT NULL DEFAULT '',      -- who it is for, only you see this
  expires_at    INTEGER,                       -- seconds since 1970; NULL = never
  max_downloads INTEGER,                       -- NULL = unlimited
  downloads     INTEGER NOT NULL DEFAULT 0,    -- how many files were downloaded with it
  revoked       INTEGER NOT NULL DEFAULT 0,    -- 1 = switched off
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE license_code_sets (
  code_id INTEGER NOT NULL REFERENCES license_codes(id) ON DELETE CASCADE,
  set_id  INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  PRIMARY KEY (code_id, set_id)
);

-- Wrong codes, per IP address, to slow down guessing (like login_attempts).
CREATE TABLE license_attempts (
  ip           TEXT NOT NULL,
  attempted_at INTEGER NOT NULL
);
CREATE INDEX idx_license_attempts_ip ON license_attempts(ip, attempted_at);

-- 3. Categories (Landscape, Sports, ...). A set can be in several.
CREATE TABLE categories (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,             -- used in the address: /?category=landscape
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE set_categories (
  set_id      INTEGER NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (set_id, category_id)
);
