// GET /api/admin/sets/:id
// One set and its photos, for the admin upload page.

export async function onRequestGet({ env, params }) {
  const set = await env.DB.prepare(
    `SELECT id, slug, title, description FROM sets WHERE id = ?`
  ).bind(Number(params.id)).first();

  if (!set) return Response.json({ error: "Set not found" }, { status: 404 });

  const { results: photos } = await env.DB.prepare(
    `SELECT id, thumb_key, width, height, alt_text, size_bytes
     FROM photos WHERE set_id = ? ORDER BY sort_order, id`
  ).bind(set.id).all();

  return Response.json({ ...set, photos });
}

// DELETE /api/admin/sets/:id
// Deletes the set, every photo row in it, and every image file in storage.
export async function onRequestDelete({ env, params }) {
  const setId = Number(params.id);
  const { results: photos } = await env.DB.prepare(
    `SELECT thumb_key, display_key FROM photos WHERE set_id = ?`
  ).bind(setId).all();

  // Database first: once the rows are gone, nothing on the site points to the
  // files any more. Doing the files first could leave broken images on show if
  // the database step then failed.
  const [, deleted] = await env.DB.batch([
    env.DB.prepare(`DELETE FROM photos WHERE set_id = ?`).bind(setId),
    env.DB.prepare(`DELETE FROM sets WHERE id = ?`).bind(setId),
  ]);
  if (deleted.meta.changes === 0) {
    return Response.json({ error: "Set not found" }, { status: 404 });
  }

  const keys = photos.flatMap((p) => [p.thumb_key, p.display_key]);
  // R2 deletes at most 1000 files per call.
  for (let i = 0; i < keys.length; i += 1000) {
    await env.BUCKET.delete(keys.slice(i, i + 1000));
  }

  return Response.json({ ok: true, deleted_photos: photos.length });
}
