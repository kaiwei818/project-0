// GET    /api/admin/sets/:id   one set and its photos, for the admin set page
// PATCH  /api/admin/sets/:id   change title, description, slug, cover photo, published, or categories
// DELETE /api/admin/sets/:id   delete the set, its photos, and their files

import { uniqueSlug } from "../../../../lib/slug.js";

export async function onRequestGet({ env, params }) {
  const set = await env.DB.prepare(
    `SELECT id, slug, title, description, cover_photo_id, published FROM sets WHERE id = ?`
  ).bind(Number(params.id)).first();

  if (!set) return Response.json({ error: "Set not found" }, { status: 404 });

  const { results: photos } = await env.DB.prepare(
    `SELECT id, thumb_key, width, height, caption, alt_text, camera_info, size_bytes,
            download_key IS NOT NULL AS downloadable
     FROM photos WHERE set_id = ? ORDER BY sort_order, id`
  ).bind(set.id).all();

  const { results: categories } = await env.DB.prepare(
    `SELECT category_id FROM set_categories WHERE set_id = ?`
  ).bind(set.id).all();

  return Response.json({ ...set, photos, category_ids: categories.map((c) => c.category_id) });
}

// Body: any of {"title", "description", "slug", "cover_photo_id", "published",
// "category_ids": [..]}.
// Fields that are left out stay as they are.
export async function onRequestPatch({ request, env, params }) {
  const setId = Number(params.id);
  const set = await env.DB.prepare(`SELECT id FROM sets WHERE id = ?`).bind(setId).first();
  if (!set) return Response.json({ error: "Set not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const changes = {};

  if ("title" in body) {
    changes.title = String(body.title).trim().slice(0, 200);
    if (!changes.title) return Response.json({ error: "The title cannot be empty." }, { status: 400 });
  }
  if ("description" in body) {
    changes.description = String(body.description).trim().slice(0, 2000);
  }
  if ("slug" in body) {
    // Clean it up the same way new slugs are made. If another set already uses
    // it, a number is added ("forest-2"); the response says what was saved.
    changes.slug = await uniqueSlug(env, body.slug, setId);
  }
  if ("cover_photo_id" in body) {
    const coverId = body.cover_photo_id === null ? null : Number(body.cover_photo_id);
    if (coverId !== null) {
      const photo = await env.DB.prepare(`SELECT id FROM photos WHERE id = ? AND set_id = ?`)
        .bind(coverId, setId).first();
      if (!photo) return Response.json({ error: "That photo is not in this set." }, { status: 400 });
    }
    changes.cover_photo_id = coverId;
  }

  if ("published" in body) {
    changes.published = body.published ? 1 : 0; // true = everyone sees it, false = draft
  }

  if (Array.isArray(body.category_ids)) {
    // Replace the set's categories with exactly this list (unknown ids are ignored).
    const ids = [...new Set(body.category_ids.map(Number))].filter(Number.isInteger);
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM set_categories WHERE set_id = ?`).bind(setId),
      ...ids.map((id) => env.DB.prepare(
        `INSERT INTO set_categories (set_id, category_id) SELECT ?, id FROM categories WHERE id = ?`
      ).bind(setId, id)),
    ]);
  }

  const columns = Object.keys(changes);
  if (columns.length === 0) {
    if (Array.isArray(body.category_ids)) return Response.json({ ok: true });
    return Response.json({ error: "Nothing to change." }, { status: 400 });
  }

  // Column names come from our own list above, never from the request, so
  // building the SQL text from them is safe. The values still go through bind().
  const updated = await env.DB.prepare(
    `UPDATE sets SET ${columns.map((c) => `${c} = ?`).join(", ")} WHERE id = ?
     RETURNING id, slug, title, description, cover_photo_id, published`
  ).bind(...Object.values(changes), setId).first();

  return Response.json(updated);
}

// Deletes the set, every photo row in it, and every image file in storage.
export async function onRequestDelete({ env, params }) {
  const setId = Number(params.id);
  const { results: photos } = await env.DB.prepare(
    `SELECT small_key, thumb_key, medium_key, display_key, download_key FROM photos WHERE set_id = ?`
  ).bind(setId).all();

  // Database first: once the rows are gone, nothing on the site points to the
  // files any more. Doing the files first could leave broken images on show if
  // the database step then failed.
  const [, , , deleted] = await env.DB.batch([
    env.DB.prepare(`DELETE FROM photos WHERE set_id = ?`).bind(setId),
    env.DB.prepare(`DELETE FROM set_categories WHERE set_id = ?`).bind(setId),
    env.DB.prepare(`DELETE FROM license_code_sets WHERE set_id = ?`).bind(setId),
    env.DB.prepare(`DELETE FROM sets WHERE id = ?`).bind(setId),
  ]);
  if (deleted.meta.changes === 0) {
    return Response.json({ error: "Set not found" }, { status: 404 });
  }

  const keys = photos.flatMap((p) => [p.small_key, p.thumb_key, p.medium_key, p.display_key, p.download_key]).filter(Boolean);
  // R2 deletes at most 1000 files per call.
  for (let i = 0; i < keys.length; i += 1000) {
    await env.BUCKET.delete(keys.slice(i, i + 1000));
  }

  return Response.json({ ok: true, deleted_photos: photos.length });
}
