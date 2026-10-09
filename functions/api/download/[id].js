// GET /api/download/:photoId?code=WL-....
// Sends the clean copy of one photo as a file download, if the code is valid
// for that photo's set. Every successful download counts toward the code's limit.

import { checkCode } from "../../../lib/license.js";

export async function onRequestGet({ request, env, params }) {
  const photo = await env.DB.prepare(
    `SELECT p.id, p.download_key, p.sort_order, s.id AS set_id, s.slug
     FROM photos p JOIN sets s ON s.id = p.set_id
     WHERE p.id = ? AND s.published = 1 AND p.download_key IS NOT NULL`
  ).bind(Number(params.id)).first();
  if (!photo) return new Response("This photo cannot be downloaded.", { status: 404 });

  const code = new URL(request.url).searchParams.get("code");
  const result = await checkCode(request, env, code, photo.set_id);
  if (!result.ok) return new Response(result.error, { status: result.status });

  const file = await env.BUCKET.get(photo.download_key);
  if (!file) return new Response("File missing. Please contact the photographer.", { status: 404 });

  // Count it. "downloads < max" is checked again here, so two downloads at the
  // same moment cannot both squeeze past the limit.
  const counted = await env.DB.prepare(
    `UPDATE license_codes SET downloads = downloads + 1
     WHERE id = ? AND (max_downloads IS NULL OR downloads < max_downloads)`
  ).bind(result.license.id).run();
  if (counted.meta.changes === 0) return new Response("This code has no downloads left.", { status: 403 });

  return new Response(file.body, {
    headers: {
      "Content-Type": "image/jpeg",
      // "attachment" = save as a file, with this name, instead of opening it.
      "Content-Disposition": `attachment; filename="${photo.slug.replace(/[^\w-]/g, "") || "photo"}-${photo.id}.jpg"`,
      "Cache-Control": "private, no-store",
    },
  });
}
