// PATCH  /api/admin/licenses/:id   body: {"revoked": true | false}  switch a code off or on
// DELETE /api/admin/licenses/:id   delete a code for good

import { logActivity } from "../../../../lib/activity.js";
import { codeName } from "../../../../lib/license.js";

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const body = await request.json().catch(() => ({}));
  if (!("revoked" in body)) return Response.json({ error: "Nothing to change." }, { status: 400 });
  const updated = await env.DB.prepare(
    `UPDATE license_codes SET revoked = ? WHERE id = ? RETURNING id, code, label, revoked`
  ).bind(body.revoked ? 1 : 0, Number(params.id)).first();
  if (!updated) return Response.json({ error: "Code not found" }, { status: 404 });
  await logActivity(context, updated.revoked ? "license_off" : "license_on",
    `Switched ${codeName(updated)} ${updated.revoked ? "off" : "on"}`);
  return Response.json({ id: updated.id, revoked: updated.revoked });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const id = Number(params.id);
  const license = await env.DB.prepare(`SELECT code, label, downloads FROM license_codes WHERE id = ?`).bind(id).first();
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM license_code_sets WHERE code_id = ?`).bind(id),
    env.DB.prepare(`DELETE FROM license_codes WHERE id = ?`).bind(id),
  ]);
  if (license) {
    await logActivity(context, "license_delete", `Deleted ${codeName(license)} (${license.downloads} downloads used)`);
  }
  return Response.json({ ok: true });
}
