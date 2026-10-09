// POST   /api/admin/about/portrait   upload a new portrait (form: small, thumb, width, height)
// DELETE /api/admin/about/portrait   remove the portrait
//
// The upload page shrinks the photo in the browser first, like set photos
// (800 and 1200 px versions, no watermark).

import { ABOUT_KEYS, getSettings, saveSettings } from "../../../../lib/settings.js";

const MAX_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = {
  jpg: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  png: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  webp: (b) => String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP",
};
const CONTENT_TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export async function onRequestPost({ request, env }) {
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Expected a form upload." }, { status: 400 });

  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 10000 || height > 10000) {
    return Response.json({ error: "Width and height must be whole numbers." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const stored = {};
  for (const size of ["small", "thumb"]) {
    const file = form.get(size);
    if (!(file instanceof File) || file.size > MAX_BYTES) {
      return Response.json({ error: `The ${size} image is missing or too large.` }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    const start = new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength));
    const ext = Object.keys(IMAGE_TYPES).find((type) => IMAGE_TYPES[type](start));
    if (!ext) return Response.json({ error: "The portrait must be JPEG, PNG, or WebP." }, { status: 400 });
    stored[size] = { key: `about/${id}-${size}.${ext}`, bytes, contentType: CONTENT_TYPES[ext] };
  }

  await Promise.all(Object.values(stored).map((f) =>
    env.BUCKET.put(f.key, f.bytes, { httpMetadata: { contentType: f.contentType } })
  ));

  const old = await getSettings(env, ABOUT_KEYS);
  await saveSettings(env, {
    about_portrait_small_key: stored.small.key,
    about_portrait_key: stored.thumb.key,
    about_portrait_width: width,
    about_portrait_height: height,
  });
  // The new portrait is saved: now remove the old files.
  await removeFiles(env, old);

  return Response.json(await getSettings(env, ABOUT_KEYS));
}

export async function onRequestDelete({ env }) {
  const old = await getSettings(env, ABOUT_KEYS);
  await saveSettings(env, {
    about_portrait_small_key: "",
    about_portrait_key: "",
    about_portrait_width: "",
    about_portrait_height: "",
  });
  await removeFiles(env, old);
  return Response.json(await getSettings(env, ABOUT_KEYS));
}

function removeFiles(env, settings) {
  const keys = [settings.about_portrait_small_key, settings.about_portrait_key].filter(Boolean);
  return keys.length ? env.BUCKET.delete(keys) : Promise.resolve();
}
