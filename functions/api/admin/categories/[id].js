// DELETE /api/admin/categories/:id   removes the category (the sets themselves stay)

export async function onRequestDelete({ env, params }) {
  const id = Number(params.id);
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM set_categories WHERE category_id = ?`).bind(id),
    env.DB.prepare(`DELETE FROM categories WHERE id = ?`).bind(id),
  ]);
  return Response.json({ ok: true });
}
