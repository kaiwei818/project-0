// GET /api/sets/:slug
// Returns one set plus all of its photos, in order.
// [slug] in the file name means "any value here", available as params.slug.

export async function onRequestGet({ env, params }) {
  const set = await env.DB.prepare(
    `SELECT id, slug, title, description FROM sets WHERE slug = ?`
  ).bind(params.slug).first();

  if (!set) {
    return Response.json({ error: "Set not found" }, { status: 404 });
  }

  const { results: photos } = await env.DB.prepare(
    `SELECT id, thumb_key, display_key, width, height, caption, alt_text
     FROM photos WHERE set_id = ?
     ORDER BY sort_order, id`
  ).bind(set.id).all();

  return Response.json({ ...set, photos });
}
