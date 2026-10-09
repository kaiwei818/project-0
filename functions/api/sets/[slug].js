// GET /api/sets/:slug
// Returns one set plus all of its photos, in order.
// [slug] in the file name means "any value here", available as params.slug.

export async function onRequestGet({ env, params }) {
  const set = await env.DB.prepare(
    `SELECT id, slug, title, description FROM sets WHERE slug = ?`
  ).bind(decodeSlug(params.slug)).first();

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

// The URL arrives still encoded: "台北夜景" comes in as "%E5%8F%B0...".
// Decode it so it matches the slug stored in the database.
function decodeSlug(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw; // a broken "%" sequence: just look up the text as it is
  }
}
