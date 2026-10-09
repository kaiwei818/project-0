// GET /api/sets
// Returns every published set for the home page: title, slug, cover thumbnail,
// and photo count. Drafts are left out.
//
// How Pages Functions work: the file path decides the URL.
// functions/api/sets/index.js  ->  /api/sets
// Exporting "onRequestGet" means this only answers GET requests.

import { publishedSets } from "../../../lib/queries.js";

export async function onRequestGet({ env }) {
  return Response.json(await publishedSets(env));
}
