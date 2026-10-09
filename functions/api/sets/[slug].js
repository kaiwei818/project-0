// GET /api/sets/:slug
// Returns one set plus all of its photos, in order.
// [slug] in the file name means "any value here", available as params.slug.
// Drafts are only returned to you when logged in (for the preview).

import { isLoggedIn } from "../../../lib/auth.js";
import { decodeSlug, setWithPhotos } from "../../../lib/queries.js";

export async function onRequestGet({ request, env, params }) {
  const set = await setWithPhotos(env, decodeSlug(params.slug));
  if (!set || (!set.published && !(await isLoggedIn(request, env)))) {
    return Response.json({ error: "Set not found" }, { status: 404 });
  }
  return Response.json(set);
}
