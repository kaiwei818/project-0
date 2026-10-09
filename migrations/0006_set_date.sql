-- The date shown on each set's card on the home page, for example when the
-- photos were taken. Stored as text "YYYY-MM-DD"; empty means "not set", and
-- the card then shows the month the set was created instead.
ALTER TABLE sets ADD COLUMN shot_date TEXT NOT NULL DEFAULT '';
