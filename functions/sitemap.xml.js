// GET /sitemap.xml
// A list of every public page, in the standard format search engines read.
// It is built fresh from the database, so new sets appear automatically.
// Drafts (including scheduled sets whose time has not come) are left out.
// Each set also lists its photos (the "image" part), so Google Images finds
// them. Those are the watermarked versions visitors see, never clean copies.

import { isPublicSql } from "../lib/visibility.js";

const IMAGES_PER_PAGE = 1000; // Google's limit per page in a sitemap

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin;
  const { results: sets } = await env.DB.prepare(
    `SELECT s.id, s.slug FROM sets s WHERE ${isPublicSql()} ORDER BY sort_order, id`
  ).all();
  const { results: photos } = await env.DB.prepare(
    `SELECT p.set_id, p.display_key FROM photos p JOIN sets s ON s.id = p.set_id
     WHERE ${isPublicSql()} ORDER BY p.set_id, p.sort_order, p.id`
  ).all();

  const imagesOf = (setId) => photos.filter((p) => p.set_id === setId).slice(0, IMAGES_PER_PAGE)
    .map((p) => `\n    <image:image><image:loc>${escapeXml(`${origin}/img/${p.display_key}`)}</image:loc></image:image>`).join("");
  const entry = (loc, images = "") => `  <url><loc>${escapeXml(loc)}</loc>${images}${images ? "\n  " : ""}</url>`;

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    entry(`${origin}/`),
    entry(`${origin}/about`),
    ...sets.map((s) => entry(`${origin}/sets/${encodeURIComponent(s.slug)}`, imagesOf(s.id))),
    "</urlset>",
    "",
  ].join("\n");

  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
}

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
