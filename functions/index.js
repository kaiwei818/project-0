// GET /
// Serves public/index.html with the hero (the big featured photo: the cover of
// your first set) and the set cards already in it, plus link-preview tags
// (sharing your home page shows the cover of your first set).
//
// The cards are built here on the server, not in the browser, so the very first
// version of the page has your real content. Google judges pages largely by that
// first version; an empty "Loading..." page gets marked as a "Soft 404".

import { withPageMeta } from "../lib/meta.js";
import { categoriesInUse, publishedSets } from "../lib/queries.js";
import { escapeHtml, heroHtml, setCardHtml } from "../lib/render.js";
import { SITE } from "../lib/site.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  // ?category=landscape shows only that category. Plain links, so the filter
  // works without JavaScript and Google can follow each category page.
  const category = (url.searchParams.get("category") || "").slice(0, 60);
  const [sets, categories] = await Promise.all([publishedSets(env, category), categoriesInUse(env)]);
  const current = categories.find((c) => c.slug === category);
  const page = await env.ASSETS.fetch(new URL("/", url));

  const button = (href, name, active) =>
    `<a href="${href}"${active ? ' aria-current="page"' : ""}>${escapeHtml(name)}</a>`;
  const nav = categories.length
    ? button("/", "All", !current) +
      categories.map((c) => button(`/?category=${encodeURIComponent(c.slug)}`, c.name, c === current)).join("")
    : "";

  // The hero: only on the main home page, and only when the first set has a cover.
  const featured = !category && sets[0]?.cover_thumb_key ? sets[0] : null;

  const filled = new HTMLRewriter()
    .on("#hero", {
      element(el) {
        if (featured) el.setInnerContent(heroHtml(featured, SITE.description), { html: true });
        else el.remove();
      },
    })
    .on("#site-tagline", { element(el) { if (featured) el.remove(); } })
    .on("#set-grid", { element(el) { el.setInnerContent(sets.map(setCardHtml).join(""), { html: true }); } })
    .on("#category-nav", {
      element(el) {
        if (nav) el.setInnerContent(nav, { html: true });
        else el.remove();
      },
    })
    .on("#status", {
      element(el) {
        if (sets.length) el.remove();
        else if (category) el.setInnerContent("No sets in this category yet.");
        else el.setInnerContent("No photo sets yet. Please come back soon.");
      },
    })
    .transform(page);

  return withPageMeta(filled, {
    title: current ? current.name : "",
    url: current ? `${url.origin}/?category=${encodeURIComponent(current.slug)}` : url.origin + "/",
    image: sets[0]?.cover_thumb_key ? `${url.origin}/img/${sets[0].cover_thumb_key}` : "",
  });
}
