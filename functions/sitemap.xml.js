// GET /sitemap.xml
// A list of every public page, in the standard format search engines read.
// It is built fresh from the database, so new sets appear automatically.
// Drafts are left out.

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  const { results: sets } = await env.DB.prepare(
    `SELECT slug FROM sets WHERE published = 1 ORDER BY sort_order, id`
  ).all();

  const urls = [`${origin}/`, `${origin}/about`, ...sets.map((s) => `${origin}/sets/${encodeURIComponent(s.slug)}`)];
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${escapeXml(u)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
