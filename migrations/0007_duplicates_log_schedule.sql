-- Three additions. Nothing existing is changed or removed.

-- 1. Duplicate detection: facts about the ORIGINAL file each photo came from,
--    so the upload page can warn before the same photo goes up twice.
--    original_name  the file name on your computer ("DSC01234.JPG"); NOCASE
--                   makes "dsc01234.jpg" count as the same name
--    original_hash  a fingerprint of the file's exact bytes (SHA-256): two
--                   files with the same hash are the same file
--    taken_at       when the camera took it, plus the camera name, from EXIF
--                   ("2025-07-14 10:22:33.45 | Sony ILCE-7M4"); empty if unknown
--    Photos uploaded before this have empty values and are never matched.
ALTER TABLE photos ADD COLUMN original_name TEXT NOT NULL DEFAULT '' COLLATE NOCASE;
ALTER TABLE photos ADD COLUMN original_hash TEXT NOT NULL DEFAULT '';
ALTER TABLE photos ADD COLUMN taken_at TEXT NOT NULL DEFAULT '';
CREATE INDEX idx_photos_original_name ON photos(original_name);
CREATE INDEX idx_photos_original_hash ON photos(original_hash);
CREATE INDEX idx_photos_taken_at ON photos(taken_at);

-- 2. Scheduled publishing: a draft with a publish_at time becomes public by
--    itself once that time has passed. Stored in UTC as "2026-10-25T01:00:00Z"
--    (that format sorts correctly as text). Empty means "not scheduled".
ALTER TABLE sets ADD COLUMN publish_at TEXT NOT NULL DEFAULT '';

-- 3. The activity log: one row per thing that happened (uploads, deletions,
--    license codes, downloads, publishing, logins), newest last.
CREATE TABLE activity_log (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  action   TEXT NOT NULL,           -- e.g. "upload", "download", "license_create"
  summary  TEXT NOT NULL,           -- one readable sentence
  set_id   INTEGER,                 -- the set it was about, if any
  country  TEXT NOT NULL DEFAULT '' -- where the request came from (country code only)
);
CREATE INDEX idx_activity_action ON activity_log(action, id);
