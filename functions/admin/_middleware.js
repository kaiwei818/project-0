// Runs before every request for an /admin page. Visitors who are not logged in
// are sent to the login page instead.

import { isLoggedIn } from "../../lib/auth.js";

const LOGIN_PAGES = ["/admin/login", "/admin/login.html"];

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const loggedIn = await isLoggedIn(request, env);

  if (LOGIN_PAGES.includes(url.pathname)) {
    // Already logged in? Skip the login page.
    return loggedIn ? Response.redirect(new URL("/admin/", url), 302) : next();
  }

  if (!loggedIn) {
    return Response.redirect(new URL("/admin/login", url), 302);
  }

  // Copy the response so its headers can be changed, then tell browsers not to
  // keep a saved copy of admin pages (so "Back" after logout shows nothing).
  const original = await next();
  const response = new Response(original.body, original);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
