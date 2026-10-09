// GET  /api/admin/sets   every set, for the dashboard list
// POST /api/admin/sets   body: {"title": "...", "description": "..."}  creates a set
// (The login check happens in ../_middleware.js.)

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.slug, s.title, COUNT(p.id) AS photo_count
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
    `INSERT INTO sets (slug, title, description, sort_order)
     VALUES (?, ?, ?, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM sets))
     RETURNING id, slug, title`
  ).bind(slug, title, description).first();

  return Response.json({ ...set, photo_count: 0 }, { status: 201 });
}

// Turns "Tokyo Nights 2026" into "tokyo-nights-2026" for the URL.
// \p{L} means "any letter in any language", so Chinese titles keep their
// characters: "台北夜景" becomes "台北夜景".
function slugify(title) {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "set";
}

// If "forest" is taken, try "forest-2", "forest-3", ...
async function uniqueSlug(env, title) {
  const base = slugify(title);
  const { results } = await env.DB.prepare(
    `SELECT slug FROM sets WHERE slug = ? OR slug LIKE ?`
  ).bind(base, `${base}-%`).all();
  const taken = new Set(results.map((row) => row.slug));

  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}
