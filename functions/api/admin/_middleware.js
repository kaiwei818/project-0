// Runs before EVERY request to /api/admin/*, so no admin endpoint can forget to
// check the login. This is the real lock. Hiding buttons in the page is not
// security, because anyone can send requests to the API directly.

import { isLoggedIn, isSameOrigin } from "../../../lib/auth.js";

export async function onRequest({ request, env, next }) {
  // Any request that changes something must come from our own pages.
  if (request.method !== "GET" && !isSameOrigin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // The login endpoint is the one door that must stay open.
  if (new URL(request.url).pathname === "/api/admin/login") {
    return next();
  }

  if (!(await isLoggedIn(request, env))) {
    return Response.json({ error: "Not logged in" }, { status: 401 });
  }

  const response = await next();
  // Never let a browser or proxy save a copy of private admin data.
  response.headers.set("Cache-Control", "no-store");
  return response;
}
