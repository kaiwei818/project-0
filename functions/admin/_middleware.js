// Runs before every request for an /admin page. Visitors who are not logged in
// are sent to the login page instead.

import { isLoggedIn } from "../../lib/auth.js";
import { withSecurityHeaders } from "../../lib/security.js";

const LOGIN_PAGES = ["/admin/login", "/admin/login.html"];

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const loggedIn = await isLoggedIn(request, env);

  if (LOGIN_PAGES.includes(url.pathname)) {
    // Already logged in? Skip the login page.
    return loggedIn ? Response.redirect(new URL("/admin/", url), 302) : withSecurityHeaders(await next());
  }

  if (!loggedIn) {
    return Response.redirect(new URL("/admin/login", url), 302);
  }

  // Tell browsers not to keep a saved copy of admin pages (so "Back" after
  // logging out shows nothing).
  const response = withSecurityHeaders(await next());
  response.headers.set("Cache-Control", "no-store");
  return response;
}
