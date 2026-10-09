// PATCH  /api/admin/licenses/:id   body: {"revoked": true | false}  switch a code off or on
// DELETE /api/admin/licenses/:id   delete a code for good

export async function onRequestPatch({ request, env, params }) {
  const body = await request.json().catch(() => ({}));
  if (!("revoked" in body)) return Response.json({ error: "Nothing to change." }, { status: 400 });
  const updated = await env.DB.prepare(
    `UPDATE license_codes SET revoked = ? WHERE id = ? RETURNING id, revoked`
  ).bind(body.revoked ? 1 : 0, Number(params.id)).first();
  if (!updated) return Response.json({ error: "Code not found" }, { status: 404 });
  return Response.json(updated);
}

export async function onRequestDelete({ env, params }) {
  const id = Number(params.id);
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM license_code_sets WHERE code_id = ?`).bind(id),
    env.DB.prepare(`DELETE FROM license_codes WHERE id = ?`).bind(id),
  ]);
  return Response.json({ ok: true });
}
