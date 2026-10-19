// GET   /api/admin/hero   how the home page hero is chosen
// PATCH /api/admin/hero   body: {"hero_mode": "first" | "latest" | "rotate",
//                                "hero_rotate": "visit" | "day"}
// See lib/hero.js for what each choice does.

import { HERO_KEYS } from "../../../../lib/hero.js";
import { getSettings, saveSettings } from "../../../../lib/settings.js";

const CHOICES = { hero_mode: ["first", "latest", "rotate"], hero_rotate: ["visit", "day"] };

export async function onRequestGet({ env }) {
  const values = await getSettings(env, HERO_KEYS);
  return Response.json({ hero_mode: values.hero_mode || "first", hero_rotate: values.hero_rotate || "visit" });
}

export async function onRequestPatch({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const changes = {};
  for (const [key, allowed] of Object.entries(CHOICES)) {
    if (key in body) {
      if (!allowed.includes(body[key])) return Response.json({ error: `Unknown choice for ${key}.` }, { status: 400 });
      changes[key] = body[key];
    }
  }
  if (!Object.keys(changes).length) return Response.json({ error: "Nothing to change." }, { status: 400 });
  await saveSettings(env, changes);
  return onRequestGet({ env });
}
