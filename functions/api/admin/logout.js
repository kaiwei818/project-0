// POST /api/admin/logout
// Tells the browser to delete the session cookie.

import { clearSessionCookie } from "../../../lib/auth.js";

export async function onRequestPost({ request }) {
  return Response.json({ ok: true }, {
    headers: { "Set-Cookie": clearSessionCookie(request) },
  });
}
