-- Adds three things. Nothing existing is changed or removed.
--
-- 1. camera_info: the camera details line shown in the viewer, for example
--    "Sony A7 IV · 35mm · f/1.8 · 1/200s · ISO 100". Filled in from the photo's
--    EXIF at upload, and editable in the admin area. Empty for older photos.
ALTER TABLE photos ADD COLUMN camera_info TEXT NOT NULL DEFAULT '';

-- 2. Two more sizes per photo, so phones download less:
--    small  (800 px, for grids on phones)
--    medium (2000 px with watermark, for the viewer on phones and tablets)
--    Older photos do not have them (NULL), and simply keep using thumb/display.
ALTER TABLE photos ADD COLUMN small_key TEXT;
ALTER TABLE photos ADD COLUMN medium_key TEXT;

-- 3. Site settings, one row per setting: the About page's bio, portrait, and
--    contact details. A key/value table means new settings later need no new
--    migration.
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);
