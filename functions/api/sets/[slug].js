// GET /api/sets/:slug
// Returns one set plus all of its photos, in order.
// [slug] in the file name means "any value here", available as params.slug.
// Drafts are only returned to you when logged in (for the preview).

import { isLoggedIn } from "../../../lib/auth.js";

export async function onRequestGet({ request, env, params }) {
  const set = await env.DB.prepare(
    `SELECT id, slug, title, description, published FROM sets WHERE slug = ?`
  ).bind(decodeSlug(params.slug)).first();

  if (!set || (!set.published && !(await isLoggedIn(request, env)))) {
    return Response.json({ error: "Set not found" }, { status: 404 });
  }

  const { results: photos } = await env.DB.prepare(
    `SELECT id, small_key, thumb_key, medium_key, display_key, width, height, caption, alt_text, camera_info
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
