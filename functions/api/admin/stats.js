// GET /api/admin/stats
// Storage readout for the dashboard, so you can watch the 10 GB free limit.
// No login check in this file: the _middleware.js next to it already did it.

export async function onRequestGet({ env }) {
  const stats = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM sets) AS set_count,
            COUNT(*) AS photo_count,
            COALESCE(SUM(size_bytes), 0) AS bytes_used
     FROM photos`
  ).first();

  return Response.json({ ...stats, bytes_limit: 10 * 1024 ** 3 });
}
