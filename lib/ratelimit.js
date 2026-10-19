// Rate limits for the public license endpoints, so nobody can try code after
// code (brute force), or pull files in bulk with a stolen code.
//
// hit(context, bucket, key) records one request and says whether it is allowed.
// Each bucket has its own limit per time window:

export const LIMITS = {
  // Checking a code on a set page (any answer, right or wrong), per IP address.
  license_check: { max: 30, seconds: 15 * 60 },
  // Downloading clean files, per IP address. "Download all" of 60 photos fits.
  download: { max: 200, seconds: 60 * 60 },
  // Downloads per code, from all addresses together: a shared code cannot be
  // used to drain everything at once.
  download_code: { max: 300, seconds: 60 * 60 },
  // WRONG codes from the whole internet together. If many addresses guess at
  // once (a "distributed" attack), checking pauses for everyone for a while.
  wrong_code_global: { max: 300, seconds: 60 * 60 },
};

// Returns { ok: true } or { ok: false, retryAfter: seconds }.
// count: false only looks, without recording a hit.
export async function hit({ env }, bucket, key, { count = true } = {}) {
  const { max, seconds } = LIMITS[bucket];
  const now = Math.floor(Date.now() / 1000);
  const since = now - seconds;
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS hits, MIN(at) AS oldest FROM rate_hits WHERE bucket = ? AND key = ? AND at > ?`
  ).bind(bucket, key, since).first();
  if (row.hits >= max) {
    return { ok: false, retryAfter: Math.max(1, (row.oldest || now) + seconds - now) };
  }
  if (count) {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO rate_hits (bucket, key, at) VALUES (?, ?, ?)`).bind(bucket, key, now),
      // Housekeeping: forget hits that no longer count.
      env.DB.prepare(`DELETE FROM rate_hits WHERE bucket = ? AND at <= ?`).bind(bucket, since),
    ]);
  }
  return { ok: true, justReachedLimit: count && row.hits + 1 === max };
}

export function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "local";
}

// A friendly "please wait" answer, with the standard Retry-After header.
export function tooMany(retryAfter, json = false) {
  const minutes = Math.ceil(retryAfter / 60);
  const message = `Too many requests. Please wait ${minutes} ${minutes === 1 ? "minute" : "minutes"} and try again.`;
  const headers = { "Retry-After": String(retryAfter) };
  return json
    ? Response.json({ error: message }, { status: 429, headers })
    : new Response(message, { status: 429, headers });
}
