// Runs for EVERY request to the site, before anything else, and touches every
// response on its way out:
//   0. sends visitors on an old address (winstonlens.pages.dev, www.) to the
//      main domain, with a "moved permanently" (301) redirect (lib/site.js)
//   1. adds the security headers (lib/security.js)
//   2. on HTML pages, fills in the site name, owner, and year (lib/site.js)
//   3. on public pages, fills in the ☰ menu and the "Get in touch" footer
//      (lib/chrome.js), and tells browsers they may load the next page early
//      (the Speculation-Rules header, see public/speculation-rules.json)
//
// Doing this in one place means no page can forget it.
//
// Cost note: because of this file, every request (pages, CSS, JS, images) runs a
// Cloudflare Function. The free plan includes 100,000 a day, which is thousands
// of visitors; one visit to a set is roughly 10 to 40 requests.

import { footerHtml, menuHtml } from "../lib/chrome.js";
import { CONTACT_KEYS } from "../lib/contact.js";
import { categoriesInUse } from "../lib/queries.js";
import { addSecurityHeaders } from "../lib/security.js";
import { getSettings } from "../lib/settings.js";
import { SITE } from "../lib/site.js";
import { isPublicSql } from "../lib/visibility.js";

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const host = url.hostname.toLowerCase();

  // A permanent redirect tells browsers and Google "this page now lives at the
  // new address", and Google moves the page's search ranking along with it.
  // 308 for forms (POST): like 301, but the browser sends the form again.
  if (SITE.oldHosts.includes(host)) {
    url.hostname = SITE.domain;
    url.protocol = "https:";
    url.port = "";
    return Response.redirect(url.toString(), ["GET", "HEAD"].includes(request.method) ? 301 : 308);
  }

  const original = await next();
  const response = new Response(original.body, original); // a copy we can change
  addSecurityHeaders(response.headers);

  // The test copy of each deploy ("2f1d6431.winstonlens.pages.dev"): keep it
  // out of Google, so search results only ever show the real address.
  if (host.endsWith(".pages.dev")) response.headers.set("X-Robots-Tag", "noindex");

  // The rules file must be served as this type, or browsers ignore it.
  if (url.pathname === "/speculation-rules.json") {
    response.headers.set("Content-Type", "application/speculationrules+json");
  }

  if (!(response.headers.get("Content-Type") || "").includes("text/html")) {
    return response;
  }

  const isPublic = !url.pathname.startsWith("/admin");
  let chrome = null;
  if (isPublic) {
    // Chrome and Edge: start loading a page as soon as the visitor points at
    // (or touches) its link, so it appears instantly when clicked.
    response.headers.set("Speculation-Rules", '"/speculation-rules.json"');
    chrome = await loadChrome(env, url);
  }

  let rewriter = new HTMLRewriter();
  if (chrome) {
    rewriter = rewriter
      .on("#site-menu", { element(el) { el.setInnerContent(chrome.menu, { html: true }); } })
      .on("#contact", { element(el) { el.setInnerContent(chrome.footer, { html: true }); } });
  }
  return rewriter
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

// The sets, categories, and contact details for the menu and footer. If the
// database cannot be reached, the page still works, with a shorter menu.
async function loadChrome(env, url) {
  try {
    const [{ results: sets }, categories, about] = await Promise.all([
      env.DB.prepare(`SELECT slug, title FROM sets s WHERE ${isPublicSql()} ORDER BY sort_order, id`).all(),
      categoriesInUse(env),
      getSettings(env, CONTACT_KEYS),
    ]);
    return {
      menu: menuHtml({ sets, categories, path: url.pathname, category: url.searchParams.get("category") || "" }),
      footer: footerHtml(about),
    };
  } catch (err) {
    console.error("Could not load the menu:", err);
    return { menu: menuHtml({ sets: [], categories: [], path: url.pathname }), footer: footerHtml({}) };
  }
}
