// Which set the big photo at the top of the home page (the "hero") shows.
// You choose the rule on the admin dashboard (setting "hero_mode"):
//
//   first    the first set in your list (move a set to the top to feature it)
//   latest   "Latest work": the set with the newest date (its Date box, or
//            the day you created it)
//   rotate   one of the sets you marked "Feature in the hero", changing every
//            visit or every day (setting "hero_rotate": "visit" or "day").
//            Seasonal highlights: a featured set can be limited to some months
//            ("3,4,5" = March to May). In its months it is preferred over
//            all-year featured sets; outside them it is not shown.
//
// Months and days follow Taiwan time (UTC+8), set in TIME_ZONE_HOURS.
// If no set fits the rule, the first set in the list is used.

import { getSettings } from "./settings.js";

const TIME_ZONE_HOURS = 8;

export const HERO_KEYS = ["hero_mode", "hero_rotate"];

// sets: the public sets in home page order (from publishedSets).
// Returns { set, label } or null.
export async function pickHero(env, sets) {
  const withCover = sets.filter((s) => s.cover_thumb_key);
  if (!withCover.length) return null;
  const { hero_mode: mode, hero_rotate: rotate } = await getSettings(env, HERO_KEYS);

  if (mode === "latest") {
    const newest = [...withCover].sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id - a.id)[0];
    return { set: newest, label: "Latest work" };
  }

  if (mode === "rotate") {
    const local = new Date(Date.now() + TIME_ZONE_HOURS * 3600 * 1000);
    const month = local.getUTCMonth() + 1;
    const featured = withCover.filter((s) => s.featured);
    const months = (s) => String(s.feature_months || "").split(",").filter(Boolean).map(Number);
    const inSeason = featured.filter((s) => months(s).includes(month));
    const allYear = featured.filter((s) => months(s).length === 0);
    const pool = inSeason.length ? inSeason : allYear;
    if (pool.length) {
      const day = Math.floor(local.getTime() / 86400000);
      const index = rotate === "day" ? day % pool.length : Math.floor(Math.random() * pool.length);
      return { set: pool[index], label: inSeason.length ? "In season" : "Featured" };
    }
  }

  return { set: withCover[0], label: "Featured" };
}
