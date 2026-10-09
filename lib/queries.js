// Database questions used in more than one place. Keeping each one here means
// the data page (/api/...) and the finished page (/, /sets/...) always agree.

// Every published set, in home page order, with its cover photo.
// categorySlug (optional): only sets in that category.
export async function publishedSets(env, categorySlug = "") {
  const { results } = await env.DB.prepare(
    `SELECT s.slug, s.title, s.description,
            (SELECT COUNT(*) FROM photos WHERE set_id = s.id) AS photo_count,
            cover.thumb_key AS cover_thumb_key,
            cover.small_key AS cover_small_key,
            cover.width AS cover_width,
            cover.height AS cover_height
     FROM sets s
     -- The cover: the chosen photo, or else the first photo in the set.
     -- Both sizes come from that same photo.
     LEFT JOIN photos cover ON cover.id = COALESCE(
       s.cover_photo_id,
       (SELECT id FROM photos WHERE set_id = s.id ORDER BY sort_order, id LIMIT 1)
     )
     WHERE s.published = 1
       AND (? = '' OR s.id IN (
         SELECT sc.set_id FROM set_categories sc
         JOIN categories c ON c.id = sc.category_id WHERE c.slug = ?))
     ORDER BY s.sort_order, s.id`
  ).bind(categorySlug, categorySlug).all();
  return results;
}

// Categories that have at least one published set: the home page filter buttons.
export async function categoriesInUse(env) {
  const { results } = await env.DB.prepare(
    `SELECT c.name, c.slug FROM categories c
     WHERE EXISTS (SELECT 1 FROM set_categories sc JOIN sets s ON s.id = sc.set_id
                   WHERE sc.category_id = c.id AND s.published = 1)
     ORDER BY c.sort_order, c.name`
  ).all();
  return results;
}

// One set by its slug, with all of its photos in order, or null.
// Drafts are included; the caller decides who may see them.
export async function setWithPhotos(env, slug) {
  const set = await env.DB.prepare(
    `SELECT s.id, s.slug, s.title, s.description, s.published,
            cover.thumb_key AS cover_thumb_key
     FROM sets s
     LEFT JOIN photos cover ON cover.id = COALESCE(
       s.cover_photo_id,
       (SELECT id FROM photos WHERE set_id = s.id ORDER BY sort_order, id LIMIT 1)
     )
     WHERE s.slug = ?`
  ).bind(slug).first();
  if (!set) return null;

  const { results: photos } = await env.DB.prepare(
    `SELECT id, small_key, thumb_key, medium_key, display_key, width, height,
            caption, alt_text, camera_info,
            download_key IS NOT NULL AS downloadable  -- never the key itself: it is private
     FROM photos WHERE set_id = ?
     ORDER BY sort_order, id`
  ).bind(set.id).all();
  return { ...set, photos };
}

// The URL arrives still encoded: "台北夜景" comes in as "%E5%8F%B0...".
// Decode it so it matches the slug stored in the database.
export function decodeSlug(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw; // a broken "%" sequence: just look up the text as it is
  }
}
