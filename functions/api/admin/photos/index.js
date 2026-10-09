// POST /api/admin/photos
// Receives one already-shrunk photo from the upload page, as a form with:
//   set_id, width, height, alt_text, thumb (file), display (file)
// Saves both files to R2 and adds a row to the photos table.
//
// The browser did the resizing, so the 25 MB original never arrives here.
// We still check everything: never trust what a browser sends.

// 15 MB per file. A 3000 px photo at quality 0.9 is usually 1 to 4 MB, but Safari
// saves JPEG (larger than WebP) and very detailed photos can go higher.
const MAX_BYTES = 15 * 1024 * 1024;

// Every image format starts with a few fixed "magic" bytes. Checking them is
// more reliable than trusting the file name or the type the browser claims.
const FORMATS = [
  { type: "image/jpeg", ext: "jpg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  {
    type: "image/webp", ext: "webp",
    matches: (b) => text(b, 0, 4) === "RIFF" && text(b, 8, 12) === "WEBP",
  },
];

export async function onRequestPost({ request, env }) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return error("Expected a form upload.");
  }

  const setId = Number(form.get("set_id"));
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  const altText = String(form.get("alt_text") || "").trim().slice(0, 500);

  if (!Number.isInteger(width) || !Number.isInteger(height) ||
      width < 1 || height < 1 || width > 10000 || height > 10000) {
    return error("Width and height must be whole numbers between 1 and 10000.");
  }

  const set = await env.DB.prepare(`SELECT id FROM sets WHERE id = ?`).bind(setId).first();
  if (!set) return error("That set does not exist.", 404);

  const thumb = await checkImage(form.get("thumb"), "thumb");
  if (thumb.error) return error(thumb.error);
  const display = await checkImage(form.get("display"), "display");
  if (display.error) return error(display.error);

  // A random id makes every key unique, which is what lets /img/ cache forever.
  const id = crypto.randomUUID();
  const thumbKey = `photos/${setId}/${id}-thumb.${thumb.format.ext}`;
  const displayKey = `photos/${setId}/${id}-display.${display.format.ext}`;

  await Promise.all([
    env.BUCKET.put(thumbKey, thumb.bytes, { httpMetadata: { contentType: thumb.format.type } }),
    env.BUCKET.put(displayKey, display.bytes, { httpMetadata: { contentType: display.format.type } }),
  ]);

  try {
    const photo = await env.DB.prepare(
      `INSERT INTO photos (set_id, thumb_key, display_key, width, height, alt_text, size_bytes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?,
               (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM photos WHERE set_id = ?))
       RETURNING id, thumb_key, display_key, width, height, alt_text, size_bytes`
    ).bind(setId, thumbKey, displayKey, width, height, altText,
           thumb.bytes.byteLength + display.bytes.byteLength, setId).first();
    return Response.json(photo, { status: 201 });
  } catch (err) {
    // The files are saved but the database row failed: remove the files so
    // they do not sit in storage forever, invisible but still counting.
    await env.BUCKET.delete([thumbKey, displayKey]);
    throw err;
  }
}

async function checkImage(file, name) {
  if (!(file instanceof File)) return { error: `Missing the ${name} image.` };
  if (file.size > MAX_BYTES) return { error: `The ${name} image is larger than 15 MB.` };

  const bytes = await file.arrayBuffer();
  const start = new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength));
  const format = FORMATS.find((f) => f.matches(start));
  if (!format) return { error: `The ${name} image must be JPEG, PNG, or WebP.` };

  return { bytes, format };
}

function text(bytes, from, to) {
  return String.fromCharCode(...bytes.slice(from, to));
}

function error(message, status = 400) {
  return Response.json({ error: message }, { status });
}
