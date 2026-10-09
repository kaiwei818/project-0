// GET /api/admin/stats
// Storage readout for the dashboard, so you can watch the 10 GB free limit,
// plus a breakdown by set (largest first) to see where the space goes.
// No login check in this file: the _middleware.js next to it already did it.

export async function onRequestGet({ env }) {
  const { results: sets } = await env.DB.prepare(
    `SELECT s.id, s.title,
            COUNT(p.id) AS photo_count,
            COALESCE(SUM(p.size_bytes), 0) AS bytes_used
     FROM sets s LEFT JOIN photos p ON p.set_id = s.id
     GROUP BY s.id
     ORDER BY bytes_used DESC, s.title`
  ).all();

  return Response.json({
    set_count: sets.length,
    photo_count: sets.reduce((sum, set) => sum + set.photo_count, 0),
    bytes_used: sets.reduce((sum, set) => sum + set.bytes_used, 0),
    bytes_limit: 10 * 1024 ** 3,
    sets,
  });
}
