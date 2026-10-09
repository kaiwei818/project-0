// POST /api/admin/login   body: {"password": "..."}
// Checks the password and, if correct, sends back the session cookie.

import { createSessionCookie, missingSecrets, verifyPassword } from "../../../lib/auth.js";

const MAX_FAILURES = 5;          // wrong passwords allowed...
const WINDOW_SECONDS = 15 * 60;  // ...per 15 minutes, per IP address

export async function onRequestPost({ request, env }) {
  const missing = missingSecrets(env);
  if (missing.length > 0) {
    return Response.json(
      { error: `Server is not set up yet. Missing: ${missing.join(", ")}. See docs/lessons/02-admin-login.md` },
      { status: 500 }
    );
  }

  // Cloudflare tells us the visitor's IP address. Locally there is none.
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const now = Math.floor(Date.now() / 1000);

  const { failures } = await env.DB.prepare(
    `SELECT COUNT(*) AS failures FROM login_attempts WHERE ip = ? AND attempted_at > ?`
  ).bind(ip, now - WINDOW_SECONDS).first();

  if (failures >= MAX_FAILURES) {
    return Response.json(
      { error: "Too many wrong passwords. Please wait 15 minutes and try again." },
      { status: 429, headers: { "Retry-After": String(WINDOW_SECONDS) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";

  if (!(await verifyPassword(password, env.ADMIN_PASSWORD_HASH))) {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO login_attempts (ip, attempted_at) VALUES (?, ?)`).bind(ip, now),
      // Housekeeping: forget attempts older than the window.
      env.DB.prepare(`DELETE FROM login_attempts WHERE attempted_at <= ?`).bind(now - WINDOW_SECONDS),
    ]);
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }

  await env.DB.prepare(`DELETE FROM login_attempts WHERE ip = ?`).bind(ip).run();

  return Response.json({ ok: true }, {
    headers: { "Set-Cookie": await createSessionCookie(request, env) },
  });
}
