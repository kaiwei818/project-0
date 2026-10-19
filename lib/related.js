// "Related sets" at the bottom of a set page: up to 4 other public sets that
// have something in common with this one. Each match earns points:
//
//   same category              3 points per shared category
//   same place                 4 points ("Kyoto, Japan" = "Kyoto, Japan"),
//                              or 1 point for the same last part ("..., Japan")
//   photos taken close in time 3 points within 2 weeks, 2 within 2 months,
//                              1 within a year (only when both sets have a Date)
//   same camera                2 points (from the photos' camera details)
//
// The sets with the most points are shown, each with its strongest reason
// ("Also Landscape", "Also in Kyoto", ...). Sets with no points are left out,
// so a set with nothing in common shows no "Related sets" section at all.

import { isPublicSql } from "./visibility.js";

const MAX = 4;

export async function relatedSets(env, setId) {
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.slug, s.title, s.location, s.shot_date,
            (SELECT COUNT(*) FROM photos WHERE set_id = s.id) AS photo_count,
            (SELECT GROUP_CONCAT(c.name, '|') FROM set_categories sc JOIN categories c ON c.id = sc.category_id
              WHERE sc.set_id = s.id) AS categories,
            (SELECT GROUP_CONCAT(DISTINCT camera_info) FROM photos WHERE set_id = s.id AND camera_info != '') AS cameras,
            cover.thumb_key AS cover_thumb_key, cover.small_key AS cover_small_key,
            cover.width AS cover_width, cover.height AS cover_height
     FROM sets s
     LEFT JOIN photos cover ON cover.id = COALESCE(
       s.cover_photo_id,
       (SELECT id FROM photos WHERE set_id = s.id ORDER BY sort_order, id LIMIT 1)
     )
     WHERE s.id = ? OR ${isPublicSql()}`
  ).bind(setId).all();

  const facts = (s) => ({
    categories: new Set((s.categories || "").split("|").filter(Boolean)),
    cameras: new Set((s.cameras || "").split(",").map(cameraOf).filter(Boolean)),
    place: (s.location || "").trim().toLowerCase(),
    country: (s.location || "").split(",").pop().trim().toLowerCase(),
    day: s.shot_date ? Date.parse(s.shot_date) / 86400000 : null,
  });

  const current = results.find((s) => s.id === setId);
  if (!current) return [];
  const mine = facts(current);

  const scored = results.filter((s) => s.id !== setId && s.cover_thumb_key).map((other) => {
    const theirs = facts(other);
    const reasons = []; // [points, text]
    for (const name of theirs.categories) if (mine.categories.has(name)) reasons.push([3, `Also ${name}`]);
    if (mine.place && theirs.place === mine.place) reasons.push([4, `Also in ${other.location.split(",")[0].trim()}`]);
    else if (mine.country && mine.country === theirs.country && mine.place.includes(",")) {
      reasons.push([1, `Also in ${other.location.split(",").pop().trim()}`]);
    }
    if (mine.day !== null && theirs.day !== null) {
      const days = Math.abs(mine.day - theirs.day);
      if (days <= 14) reasons.push([3, "Around the same time"]);
      else if (days <= 60) reasons.push([2, "Around the same time"]);
      else if (days <= 365) reasons.push([1, "The same year"]);
    }
    for (const camera of theirs.cameras) {
      if (mine.cameras.has(camera)) {
        reasons.push([2, `Also shot with ${camera}`]);
        break;
      }
    }
    const score = reasons.reduce((sum, [points]) => sum + points, 0);
    reasons.sort((a, b) => b[0] - a[0]);
    return { ...other, score, reason: reasons[0]?.[1] || "" };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || b.id - a.id)
    .slice(0, MAX);
}

// "Sony A7 IV · 35mm · f/1.8 · 1/200s · ISO 100" -> "Sony A7 IV".
// Lines that start with the lens length ("35mm · ...") name no camera.
function cameraOf(info) {
  const first = String(info).split(" · ")[0].trim();
  return /^\d+(\.\d+)?mm$|^f\/|^ISO/.test(first) ? "" : first;
}
