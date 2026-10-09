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
            COUNT(p.id) AS photo_count,
            -- Use the chosen cover, or fall back to the first photo in the set.
            COALESCE(
              (SELECT thumb_key FROM photos WHERE id = s.cover_photo_id),
              (SELECT thumb_key FROM photos WHERE set_id = s.id
                 ORDER BY sort_order, id LIMIT 1)
            ) AS cover_thumb_key
     FROM sets s
     LEFT JOIN photos p ON p.set_id = s.id
     WHERE s.published = 1
     GROUP BY s.id
     ORDER BY s.sort_order, s.id`
  ).all();

  return Response.json(results);
}
