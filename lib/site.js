// The site's name and owner, in ONE place.
// Every page gets these filled in by functions/_middleware.js, so to rename the
// site, change the text here and deploy. Nothing else needs editing.

export const SITE = {
  name: "winstonlens",                         // header, browser tab, link previews
  owner: "Winston Chang",                      // the © line at the bottom of each page
  description: "Photography by Winston Chang.", // shown by Google and in link previews
  // The one main address. Visitors who arrive at the old address
  // (winstonlens.pages.dev) or at www. are sent here (functions/_middleware.js),
  // so Google files everything under this one name.
  domain: "winstonlens.com",
  // Other names of the same site that should send visitors to the domain above.
  // (The test copies Cloudflare makes for each deploy, like
  // "2f1d6431.winstonlens.pages.dev", are left alone but hidden from Google.)
  oldHosts: ["winstonlens.pages.dev", "www.winstonlens.com"],
};
