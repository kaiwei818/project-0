// GET /robots.txt
// Instructions for search engines: index the gallery, skip the admin area and
// the data addresses, and here is the list of pages (the sitemap).

export function onRequestGet({ request }) {
  const origin = new URL(request.url).origin;
  const text = [
    "User-agent: *",
    "Disallow: /admin",
    "Disallow: /api/",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
  return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
