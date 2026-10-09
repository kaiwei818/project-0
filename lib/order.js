// Saves a new order for sets or photos.
//
// The browser sends the full list of ids in the new order, for example
// [12, 9, 15]. We check it contains exactly the ids that exist (no missing, no
// extra, no duplicates), then set sort_order = 0, 1, 2, ... in one batch.

export async function saveOrder(env, { table, ids, scope = "", scopeArgs = [] }) {
  if (!Array.isArray(ids) || !ids.every(Number.isInteger)) {
    return Response.json({ error: "Expected a list of ids." }, { status: 400 });
  }

  // `table` and `scope` are fixed strings from our own code, never from the request.
  const { results } = await env.DB.prepare(
    `SELECT id FROM ${table} ${scope ? `WHERE ${scope}` : ""}`
  ).bind(...scopeArgs).all();
  const existing = results.map((row) => row.id).sort((a, b) => a - b);
  const sent = [...ids].sort((a, b) => a - b);

  if (existing.length !== sent.length || existing.some((id, i) => id !== sent[i])) {
    return Response.json(
      { error: "The list is out of date. Reload the page and try again." },
      { status: 409 }
    );
  }

  await env.DB.batch(ids.map((id, position) =>
    env.DB.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).bind(position, id)
  ));
  return Response.json({ ok: true });
}
