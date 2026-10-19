-- Four additions. Nothing existing is changed or removed.

-- 1. Home page hero choices, per set (how the hero is picked is a site setting,
--    "hero_mode", in the settings table).
--    featured        1 = this set can appear in the hero when it rotates
--    feature_months  only in these months, for seasonal highlights: "3,4,5" means
--                    March to May; empty means all year
ALTER TABLE sets ADD COLUMN featured INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sets ADD COLUMN feature_months TEXT NOT NULL DEFAULT '';

-- 2. Where the photos were taken, for example "Kyoto, Japan". Used to find
--    related sets (same place), and shown under the set's title.
ALTER TABLE sets ADD COLUMN location TEXT NOT NULL DEFAULT '';

-- 3. Download receipts: one row per clean file downloaded with a license code.
--    Titles and names are copied in, so a receipt still makes sense after the
--    set, photo, or code is deleted. Only the region is kept, never the IP address.
CREATE TABLE download_receipts (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  code_id        INTEGER,
  code           TEXT NOT NULL,
  code_label     TEXT NOT NULL DEFAULT '',
  set_id         INTEGER,
  set_title      TEXT NOT NULL DEFAULT '',
  photo_id       INTEGER,
  photo_name     TEXT NOT NULL DEFAULT '',
  country        TEXT NOT NULL DEFAULT '',  -- "TW"
  region         TEXT NOT NULL DEFAULT '',  -- "Taipei City"
  city           TEXT NOT NULL DEFAULT '',  -- "Taipei"
  via_all        INTEGER NOT NULL DEFAULT 0 -- 1 = part of "Download all"
);
CREATE INDEX idx_receipts_code ON download_receipts(code_id, id);

-- 4. Rate limits: one row per request that counts toward a limit, removed
--    after its time window. "bucket" says which limit ("license_check",
--    "download", ...), "key" whose (an IP address, kept only for that window).
CREATE TABLE rate_hits (
  bucket TEXT NOT NULL,
  key    TEXT NOT NULL,
  at     INTEGER NOT NULL  -- seconds since 1970
);
CREATE INDEX idx_rate_hits ON rate_hits(bucket, key, at);
