-- A tiny, blurry preview of each photo (an 8 px color grid, about 200 bytes),
-- shown while the real photo loads, so a soft version of it appears at once
-- instead of an empty box. Made in the browser at upload (js/placeholder.js).
-- Photos uploaded before this get one the next time their set is opened in the
-- admin page; until then they show the plain background color as before.
ALTER TABLE photos ADD COLUMN placeholder TEXT NOT NULL DEFAULT '';
