// DELETE /api/admin/photos/:id
// Deletes one photo: its database row and both of its image files.

export async function onRequestDelete({ env, params }) {
  const photo = await env.DB.prepare(
    `SELECT id, thumb_key, display_key FROM photos WHERE id = ?`
  ).bind(Number(params.id)).first();

  if (!photo) return Response.json({ error: "Photo not found" }, { status: 404 });

  await env.DB.batch([
    // If this photo was a set's cover, go back to "first photo is the cover".
    env.DB.prepare(`UPDATE sets SET cover_photo_id = NULL WHERE cover_photo_id = ?`).bind(photo.id),
    env.DB.prepare(`DELETE FROM photos WHERE id = ?`).bind(photo.id),
  ]);
  await env.BUCKET.delete([photo.thumb_key, photo.display_key]);

  return Response.json({ ok: true });
}
