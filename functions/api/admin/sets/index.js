// GET  /api/admin/sets   every set, for the dashboard list
// POST /api/admin/sets   body: {"title": "...", "description": "..."}  creates a set
//                        New sets start as drafts, visible only to you.
// (The login check happens in ../_middleware.js.)

import { uniqueSlug } from "../../../../lib/slug.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.slug, s.title, s.published, COUNT(p.id) AS photo_count
     FROM sets s LEFT JOIN photos p ON p.set_id = s.id
     GROUP BY s.id
     ORDER BY s.sort_order, s.id`
  ).all();
  return Response.json(results);
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const title = String(body.title || "").trim().slice(0, 200);
  const description = String(body.description || "").trim().slice(0, 2000);

  if (!title) {
    return Response.json({ error: "Please give the set a title." }, { status: 400 });
  }

  const slug = await uniqueSlug(env, title);
  const set = await env.DB.prepare(
    `INSERT INTO sets (slug, title, description, published, sort_order)
     VALUES (?, ?, ?, 0, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM sets))
     RETURNING id, slug, title, published`
  ).bind(slug, title, description).first();

  return Response.json({ ...set, photo_count: 0 }, { status: 201 });
}
