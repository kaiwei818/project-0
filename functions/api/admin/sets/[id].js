// GET /api/admin/sets/:id
// One set and its photos, for the admin upload page.

export async function onRequestGet({ env, params }) {
  const set = await env.DB.prepare(
    `SELECT id, slug, title, description FROM sets WHERE id = ?`
  ).bind(Number(params.id)).first();

  if (!set) return Response.json({ error: "Set not found" }, { status: 404 });

  const { results: photos } = await env.DB.prepare(
    `SELECT id, thumb_key, width, height, alt_text, size_bytes
     FROM photos WHERE set_id = ? ORDER BY sort_order, id`
  ).bind(set.id).all();

  return Response.json({ ...set, photos });
}
