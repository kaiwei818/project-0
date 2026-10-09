// Runs for EVERY request to the site, before anything else, and touches every
// response on its way out:
//   1. adds the security headers (lib/security.js)
//   2. on HTML pages, fills in the site name, owner, and year (lib/site.js)
//
// Doing this in one place means no page can forget it.
//
// Cost note: because of this file, every request (pages, CSS, JS, images) runs a
// Cloudflare Function. The free plan includes 100,000 a day, which is thousands
// of visitors; one visit to a set is roughly 10 to 40 requests.

import { addSecurityHeaders } from "../lib/security.js";
import { SITE } from "../lib/site.js";

export async function onRequest({ next }) {
  const original = await next();
  const response = new Response(original.body, original); // a copy we can change
  addSecurityHeaders(response.headers);

  if (!(response.headers.get("Content-Type") || "").includes("text/html")) {
    return response;
  }

  return new HTMLRewriter()
    // <span data-site="name"></span>  becomes  <span data-site="name">winstonlens</span>
    .on("[data-site]", {
      element(el) {
        const key = el.getAttribute("data-site");
        el.setInnerContent(key === "year" ? String(new Date().getUTCFullYear()) : SITE[key] ?? "");
      },
    })
    // <title data-page="Forest">  becomes  <title>Forest | winstonlens</title>
    .on("title", {
      element(el) {
        const page = el.getAttribute("data-page");
        el.setInnerContent(page ? `${page} | ${SITE.name}` : SITE.name);
        el.removeAttribute("data-page");
      },
    })
    .on('meta[property="og:site_name"]', { element(el) { el.setAttribute("content", SITE.name); } })
    .on('meta[name="description"]', {
      element(el) {
        if (!el.getAttribute("content")) el.setAttribute("content", SITE.description);
      },
    })
    .transform(response);
}
