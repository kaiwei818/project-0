// GET /api/download/:photoId?code=WL-....
// Sends the clean copy of one photo as a file download, if the code is valid
// for that photo's set. Every successful download counts toward the code's limit,
// and is written to the activity log (refused ones too, for codes that exist).
// "&all=1" only marks the log line as part of "Download all".

import { logActivity, quoted } from "../../../lib/activity.js";
import { checkCode, codeName } from "../../../lib/license.js";
import { isPublicSql } from "../../../lib/visibility.js";

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const photo = await env.DB.prepare(
    `SELECT p.id, p.download_key, p.sort_order, s.id AS set_id, s.slug, s.title
     FROM photos p JOIN sets s ON s.id = p.set_id
     WHERE p.id = ? AND ${isPublicSql()} AND p.download_key IS NOT NULL`
  ).bind(Number(params.id)).first();
  if (!photo) return new Response("This photo cannot be downloaded.", { status: 404 });

  const url = new URL(request.url);
  const via = url.searchParams.get("all") ? " (Download all)" : "";
  const result = await checkCode(request, env, url.searchParams.get("code"), photo.set_id);
  if (!result.ok) {
    if (result.license) {
      await logActivity(context, "download_refused",
        `Refused ${codeName(result.license)} for photo #${photo.id} in ${quoted(photo.title)}: ${result.error}`, photo.set_id);
    }
    return new Response(result.error, { status: result.status });
  }

  const file = await env.BUCKET.get(photo.download_key);
  if (!file) return new Response("File missing. Please contact the photographer.", { status: 404 });

  // Count it. "downloads < max" is checked again here, so two downloads at the
  // same moment cannot both squeeze past the limit.
  const counted = await env.DB.prepare(
    `UPDATE license_codes SET downloads = downloads + 1
     WHERE id = ? AND (max_downloads IS NULL OR downloads < max_downloads)
     RETURNING downloads, max_downloads`
  ).bind(result.license.id).first();
  if (!counted) {
    await logActivity(context, "download_refused",
      `Refused ${codeName(result.license)} for photo #${photo.id} in ${quoted(photo.title)}: no downloads left`, photo.set_id);
    return new Response("This code has no downloads left.", { status: 403 });
  }
  const used = counted.max_downloads === null ? `${counted.downloads} used, no limit` : `${counted.downloads} of ${counted.max_downloads} used`;
  await logActivity(context, "download",
    `${codeName(result.license)} downloaded photo #${photo.id} from ${quoted(photo.title)}${via} (${used})`, photo.set_id);

  return new Response(file.body, {
    headers: {
      "Content-Type": "image/jpeg",
      // "attachment" = save as a file, with this name, instead of opening it.
      "Content-Disposition": `attachment; filename="${photo.slug.replace(/[^\w-]/g, "") || "photo"}-${photo.id}.jpg"`,
      "Cache-Control": "private, no-store",
    },
  });
}
