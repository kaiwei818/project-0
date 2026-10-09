// GET /
// Serves public/index.html with link-preview tags, so sharing your home page
// shows the cover of your first set.

import { withPageMeta } from "../lib/meta.js";

export async function onRequestGet({ request, env }) {
  const first = await env.DB.prepare(
    `SELECT COALESCE(
              (SELECT thumb_key FROM photos WHERE id = s.cover_photo_id),
              (SELECT thumb_key FROM photos WHERE set_id = s.id ORDER BY sort_order, id LIMIT 1)
            ) AS cover_key
     FROM sets s WHERE s.published = 1
     ORDER BY s.sort_order, s.id LIMIT 1`
  ).first();

  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new URL("/", url));
  return withPageMeta(page, {
    url: url.origin + "/",
    image: first?.cover_key ? `${url.origin}/img/${first.cover_key}` : "",
  });
}
