// POST /api/license/check   body: {"code": "WL-....", "slug": "set-address"}
// Tells the set page whether a code unlocks downloads for that set.

import { checkCode, downloadsLeft } from "../../../lib/license.js";
import { isSameOrigin } from "../../../lib/auth.js";

export async function onRequestPost({ request, env }) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => ({}));

  const set = await env.DB.prepare(`SELECT id FROM sets WHERE slug = ? AND published = 1`)
    .bind(String(body.slug || "")).first();
  if (!set) return Response.json({ error: "Set not found." }, { status: 404 });

  const result = await checkCode(request, env, body.code, set.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ok: true, downloads_left: downloadsLeft(result.license) });
}
