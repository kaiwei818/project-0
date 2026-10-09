// PATCH /api/admin/sets/order   body: {"set_ids": [3, 1, 2]}
// Saves the order of the sets on the home page.
// (A fixed name like "order" wins over [id].js, so this is not mistaken for set "order".)

import { saveOrder } from "../../../../lib/order.js";

export async function onRequestPatch({ request, env }) {
  const body = await request.json().catch(() => ({}));
  return saveOrder(env, { table: "sets", ids: body.set_ids });
}
