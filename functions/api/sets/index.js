// GET /api/sets
// Returns every published set for the home page: title, slug, cover thumbnail,
// and photo count. Drafts are left out.
//
// How Pages Functions work: the file path decides the URL.
// functions/api/sets/index.js  ->  /api/sets
// Exporting "onRequestGet" means this only answers GET requests.

export async function onRequestGet({ env }) {
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
     ORDER BY s.sort_order, s.id`
  ).all();

  return Response.json(results);
}
