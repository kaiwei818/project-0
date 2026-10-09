// GET /
// Serves public/index.html with the set cards already in it, plus link-preview
// tags (sharing your home page shows the cover of your first set).
//
// The cards are built here on the server, not in the browser, so the very first
// version of the page has your real content. Google judges pages largely by that
// first version; an empty "Loading..." page gets marked as a "Soft 404".

import { withPageMeta } from "../lib/meta.js";
import { publishedSets } from "../lib/queries.js";
import { setCardHtml } from "../lib/render.js";

export async function onRequestGet({ request, env }) {
  const sets = await publishedSets(env);
  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new URL("/", url));

  const filled = new HTMLRewriter()
    .on("#set-grid", { element(el) { el.setInnerContent(sets.map(setCardHtml).join(""), { html: true }); } })
    .on("#status", {
      element(el) {
        if (sets.length) el.remove();
        else el.setInnerContent("No photo sets yet. Please come back soon.");
      },
    })
    .transform(page);

  return withPageMeta(filled, {
    url: url.origin + "/",
    image: sets[0]?.cover_thumb_key ? `${url.origin}/img/${sets[0].cover_thumb_key}` : "",
  });
}
