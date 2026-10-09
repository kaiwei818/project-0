// PATCH /api/admin/sets/:id/reorder   body: {"photo_ids": [8, 5, 6, 7]}
// Saves the order of the photos inside one set.

import { saveOrder } from "../../../../../lib/order.js";

export async function onRequestPatch({ request, env, params }) {
  const body = await request.json().catch(() => ({}));
  return saveOrder(env, {
    table: "photos",
    ids: body.photo_ids,
    scope: "set_id = ?",
    scopeArgs: [Number(params.id)],
  });
}
