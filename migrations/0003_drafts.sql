-- Adds the Draft / Published switch for sets.
-- 1 = published (everyone can see it), 0 = draft (only you, when logged in).
-- Sets that already exist stay published, so nothing disappears from the site.
-- New sets are created as drafts by functions/api/admin/sets/index.js.

ALTER TABLE sets ADD COLUMN published INTEGER NOT NULL DEFAULT 1;
