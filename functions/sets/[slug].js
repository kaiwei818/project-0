// GET /sets/:slug
// Serves public/set.html, but first fills in the page title and Open Graph tags
// for this set. Social sites (iMessage, Facebook, LINE) do not run JavaScript, so
// the link preview needs these tags already in the HTML the server sends.

export async function onRequestGet({ request, env, params }) {
  const set = await env.DB.prepare(
    `SELECT s.id, s.title, s.description,
            COALESCE(
              (SELECT display_key FROM photos WHERE id = s.cover_photo_id),
              (SELECT display_key FROM photos WHERE set_id = s.id
                 ORDER BY sort_order, id LIMIT 1)
            ) AS cover_key
     FROM sets s WHERE s.slug = ?`
  ).bind(decodeSlug(params.slug)).first();

  // Fetch the static set.html file from the public folder.
  const page = await env.ASSETS.fetch(new URL("/set.html", request.url));

  if (!set) {
    return new Response(page.body, { status: 404, headers: page.headers });
  }

  const origin = new URL(request.url).origin;
  const title = `${set.title} | Photography`;
  const image = set.cover_key ? `${origin}/img/${set.cover_key}` : "";

  // HTMLRewriter edits the HTML as it streams by. setAttribute escapes the
  // values for us, so a title with quotes in it cannot break the page.
  return new HTMLRewriter()
    .on("title", { element(el) { el.setInnerContent(title); } })
    .on('meta[property="og:title"]', { element(el) { el.setAttribute("content", title); } })
    .on('meta[property="og:description"]', { element(el) { el.setAttribute("content", set.description); } })
    .on('meta[property="og:image"]', { element(el) { el.setAttribute("content", image); } })
    .transform(page);
}

// The URL arrives still encoded: "台北夜景" comes in as "%E5%8F%B0...".
// Decode it so it matches the slug stored in the database.
function decodeSlug(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw; // a broken "%" sequence: just look up the text as it is
  }
}
