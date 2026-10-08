// GET /img/:key
// Streams an image out of the R2 bucket.
// [[key]] (double brackets) catches the whole rest of the path, slashes included,
// so /img/sets/3/abc-thumb.webp gives params.key = ["sets", "3", "abc-thumb.webp"].
//
// Step 8 adds hotlink protection here. For now it just serves the file.

export async function onRequestGet({ env, params }) {
  const key = params.key.join("/");
  const object = await env.BUCKET.get(key);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers); // copies the Content-Type saved at upload
  headers.set("etag", object.httpEtag);
  // Every upload gets a new, unique key, so a file never changes.
  // Browsers may cache it for a year without checking again.
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}
