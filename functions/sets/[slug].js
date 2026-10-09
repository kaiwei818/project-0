// GET /sets/:slug
// Serves public/set.html with this set's title and link-preview tags filled in.
// Drafts are only shown to you (when logged in), as a preview. Everyone else,
// and anyone asking for a set that does not exist, gets the "not found" page.

import { isLoggedIn } from "../../lib/auth.js";
import { withPageMeta } from "../../lib/meta.js";

export async function onRequestGet({ request, env, params }) {
  const set = await env.DB.prepare(
    `SELECT s.id, s.title, s.description, s.published,
            COALESCE(
              (SELECT thumb_key FROM photos WHERE id = s.cover_photo_id),
              (SELECT thumb_key FROM photos WHERE set_id = s.id
                 ORDER BY sort_order, id LIMIT 1)
            ) AS cover_key
     FROM sets s WHERE s.slug = ?`
  ).bind(decodeSlug(params.slug)).first();

  const visible = set && (set.published || (await isLoggedIn(request, env)));
  if (!visible) {
    const notFound = await env.ASSETS.fetch(new URL("/404", request.url));
    return new Response(notFound.body, { status: 404, headers: notFound.headers });
  }

  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new URL("/set.html", url));
  return withPageMeta(page, {
    title: set.title,
    description: set.description,
    url: url.origin + url.pathname,
    // The 1200 px thumbnail, not the 3000 px version: link previews are small,
    // and some apps give up on large images.
    image: set.cover_key ? `${url.origin}/img/${set.cover_key}` : "",
  });
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
