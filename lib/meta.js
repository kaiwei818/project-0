// Fills in a page's title and link-preview tags.
//
// Social apps (iMessage, LINE, Facebook) and Google do not run JavaScript, so
// these must already be in the HTML the server sends. Pages that use this have
// the empty <meta> tags in their HTML; we only fill in the values.

import { jsonForPage } from "./render.js";
import { SITE } from "./site.js";

// structuredData (optional): facts for Google in the schema.org format, added
// as <script type="application/ld+json">. Browsers do not run it; Google reads
// it to understand the page ("a photo gallery by Winston Chang").
export function withPageMeta(page, { title = "", description = "", image = "", url = "", structuredData = null }) {
  const fullTitle = title ? `${title} | ${SITE.name}` : SITE.name;
  const text = description || SITE.description;
  const content = (value) => ({ element(el) { el.setAttribute("content", value); } });

  // setAttribute escapes the values, so a title with quotes cannot break the page.
  return new HTMLRewriter()
    // The page part of the title. _middleware.js adds " | winstonlens".
    .on("title", { element(el) { el.setAttribute("data-page", title); } })
    .on('meta[name="description"]', content(text))
    .on('meta[property="og:title"]', content(fullTitle))
    .on('meta[property="og:description"]', content(text))
    .on('meta[property="og:url"]', content(url))
    // "This is the main address of this page", so Google does not count copies
    // (for example the same page reached with ?something added) as duplicates.
    .on('link[rel="canonical"]', url ? { element(el) { el.setAttribute("href", url); } } : { element(el) { el.remove(); } })
    .on('meta[property="og:image"]', image ? content(image) : { element(el) { el.remove(); } })
    // A big picture in the preview when there is an image, a small card otherwise.
    .on('meta[name="twitter:card"]', content(image ? "summary_large_image" : "summary"))
    .on("head", {
      element(el) {
        if (structuredData) {
          el.append(`<script type="application/ld+json">${jsonForPage(structuredData)}</script>`, { html: true });
        }
      },
    })
    .transform(page);
}
