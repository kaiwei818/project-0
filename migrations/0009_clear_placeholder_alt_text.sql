-- Photos used to get the automatic description "Photo from <set name>". It
-- tells a blind visitor nothing about the photo. Clear it, so the admin page
-- shows "Not written yet" for these photos, ready for a real description.
--
-- Only the exact automatic text is cleared. A description you wrote yourself,
-- even one starting "Photo from ...", is kept. (Photos in a set renamed since
-- upload keep the old automatic text: fix those by hand, see lesson 18.)
UPDATE photos SET alt_text = ''
WHERE alt_text = 'Photo from ' || (SELECT title FROM sets WHERE sets.id = photos.set_id);
