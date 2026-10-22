-- Photos used to get the automatic description "Photo from <set name>". It
-- tells a blind visitor nothing about the photo, and it kept the old name after
-- a set was renamed. Clear it, so the admin page shows "Not written yet" for
-- these photos, ready for a real description.
UPDATE photos SET alt_text = '' WHERE alt_text LIKE 'Photo from %';
