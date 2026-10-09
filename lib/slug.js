// A "slug" is the part of a web address that names a set: /sets/tokyo-nights.

// Turns "Tokyo Nights 2026" into "tokyo-nights-2026".
// \p{L} means "any letter in any language", so Chinese titles keep their
// characters: "台北夜景" becomes "台北夜景".
export function slugify(text) {
  return String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "set";
}

// If "forest" is taken, try "forest-2", "forest-3", ...
// exceptSetId: when renaming a set, its own current slug does not count as taken.
export async function uniqueSlug(env, text, exceptSetId = 0) {
  const base = slugify(text);
  const { results } = await env.DB.prepare(
    `SELECT slug FROM sets WHERE (slug = ? OR slug LIKE ?) AND id != ?`
  ).bind(base, `${base}-%`, exceptSetId).all();
  const taken = new Set(results.map((row) => row.slug));

  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}
