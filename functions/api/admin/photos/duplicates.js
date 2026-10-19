// POST /api/admin/photos/duplicates
// Body: {"files": [{"key": "1", "name": "DSC01234.JPG", "hash": "ab12...", "taken_at": "..."}]}
// For each file the upload page is about to shrink, finds photos already on
// the site with the same file name, the same file contents (hash), or the same
// capture moment (time and camera from EXIF).
// Answer: {"matches": {"1": [{"id", "set_id", "set_title", "thumb_key", "reasons": ["hash", "name"]}]}}
// Only files with at least one match are listed.

const MAX_FILES = 500;
const PER_BATCH = 50; // questions sent to the database in one go

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const files = (Array.isArray(body.files) ? body.files : []).slice(0, MAX_FILES).map((f) => ({
    key: String(f.key ?? ""),
    name: String(f.name || "").slice(0, 255),
    hash: /^[0-9a-f]{64}$/.test(f.hash || "") ? f.hash : "",
    takenAt: String(f.taken_at || "").slice(0, 120),
  }));

  const matches = {};
  for (let i = 0; i < files.length; i += PER_BATCH) {
    const chunk = files.slice(i, i + PER_BATCH);
    // Empty values never match ("" is what older photos have).
    const answers = await env.DB.batch(chunk.map((f) => env.DB.prepare(
      `SELECT p.id, p.set_id, s.title AS set_title, p.thumb_key,
              (p.original_hash = ?1 AND ?1 != '') AS same_hash,
              (p.original_name = ?2 AND ?2 != '') AS same_name,
              (p.taken_at = ?3 AND ?3 != '') AS same_moment
       FROM photos p JOIN sets s ON s.id = p.set_id
       WHERE (?1 != '' AND p.original_hash = ?1)
          OR (?2 != '' AND p.original_name = ?2)
          OR (?3 != '' AND p.taken_at = ?3)
       ORDER BY p.id DESC LIMIT 5`
    ).bind(f.hash, f.name, f.takenAt)));

    chunk.forEach((f, n) => {
      const rows = answers[n].results;
      if (!rows.length) return;
      matches[f.key] = rows.map((row) => ({
        id: row.id,
        set_id: row.set_id,
        set_title: row.set_title,
        thumb_key: row.thumb_key,
        reasons: [row.same_hash && "hash", row.same_moment && "moment", row.same_name && "name"].filter(Boolean),
      }));
    });
  }
  return Response.json({ matches });
}
