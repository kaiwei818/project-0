// PATCH  /api/admin/photos/:id   body: any of {"caption", "alt_text", "camera_info"}
// DELETE /api/admin/photos/:id   deletes the row and all of its image files

export async function onRequestPatch({ request, env, params }) {
  const body = await request.json().catch(() => ({}));
  const changes = {};
  // caption:  shown to everyone under the photo in the viewer
  // alt_text: read aloud by screen readers, and used by Google image search
  if ("caption" in body) changes.caption = String(body.caption).trim().slice(0, 1000);
  if ("alt_text" in body) changes.alt_text = String(body.alt_text).trim().slice(0, 500);
  // camera_info: the camera details line in the viewer; empty hides it
  if ("camera_info" in body) changes.camera_info = String(body.camera_info).trim().slice(0, 200);

  const columns = Object.keys(changes);
  if (columns.length === 0) return Response.json({ error: "Nothing to change." }, { status: 400 });

  const updated = await env.DB.prepare(
    `UPDATE photos SET ${columns.map((c) => `${c} = ?`).join(", ")} WHERE id = ?
     RETURNING id, caption, alt_text, camera_info`
  ).bind(...Object.values(changes), Number(params.id)).first();

  if (!updated) return Response.json({ error: "Photo not found" }, { status: 404 });
  return Response.json(updated);
}

export async function onRequestDelete({ env, params }) {
  const photo = await env.DB.prepare(
    `SELECT id, small_key, thumb_key, medium_key, display_key FROM photos WHERE id = ?`
  ).bind(Number(params.id)).first();

  if (!photo) return Response.json({ error: "Photo not found" }, { status: 404 });

  await env.DB.batch([
    // If this photo was a set's cover, go back to "first photo is the cover".
    env.DB.prepare(`UPDATE sets SET cover_photo_id = NULL WHERE cover_photo_id = ?`).bind(photo.id),
    env.DB.prepare(`DELETE FROM photos WHERE id = ?`).bind(photo.id),
  ]);
  // Older photos have no small/medium version (null): leave those out.
  await env.BUCKET.delete([photo.small_key, photo.thumb_key, photo.medium_key, photo.display_key].filter(Boolean));

  return Response.json({ ok: true });
}
