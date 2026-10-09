// GET /sets/:slug
// Serves public/set.html with this set's title, description, and photo grid
// already in the page (built here on the server, so Google and link previews
// see the real content), plus the link-preview tags.
// Drafts are only shown to you (when logged in), as a preview. Everyone else,
// and anyone asking for a set that does not exist, gets the "not found" page.

import { isLoggedIn } from "../../lib/auth.js";
import { withPageMeta } from "../../lib/meta.js";
import { decodeSlug, setWithPhotos } from "../../lib/queries.js";
import { jsonForPage, photoThumbHtml } from "../../lib/render.js";

export async function onRequestGet({ request, env, params }) {
  const set = await setWithPhotos(env, decodeSlug(params.slug));

  const visible = set && (set.published || (await isLoggedIn(request, env)));
  if (!visible) {
    const notFound = await env.ASSETS.fetch(new URL("/404", request.url));
    return new Response(notFound.body, { status: 404, headers: notFound.headers });
  }

  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new URL("/set.html", url));

  const filled = new HTMLRewriter()
    .on("#set-title", { element(el) { el.setInnerContent(set.title); } }) // plain text: escaped for us
    .on("#set-description", {
      element(el) {
        if (set.description) el.setInnerContent(set.description);
        else el.remove();
      },
    })
    .on("#photo-grid", { element(el) { el.setInnerContent(set.photos.map(photoThumbHtml).join(""), { html: true }); } })
    .on("#status", {
      element(el) {
        if (set.photos.length) el.remove();
        else el.setInnerContent("This set has no photos yet.");
      },
    })
    // The license code box, only when some photos here can be downloaded.
    .on("#license-panel", {
      element(el) {
        if (set.published && set.photos.some((p) => p.downloadable)) el.removeAttribute("hidden");
        else el.remove();
      },
    })
    // Only you can open a draft; remind yourself it is not public yet.
    .on("#draft-banner", { element(el) { if (!set.published) el.removeAttribute("hidden"); } })
    // The photo details the viewer needs, for set.js. No second request needed.
    .on("#set-data", { element(el) { el.setInnerContent(jsonForPage(set.photos), { html: true }); } })
    .transform(page);

  return withPageMeta(filled, {
    title: set.title,
    description: set.description,
    url: url.origin + url.pathname,
    // The 1200 px thumbnail, not the 3000 px version: link previews are small,
    // and some apps give up on large images.
    image: set.cover_thumb_key ? `${url.origin}/img/${set.cover_thumb_key}` : "",
  });
}
