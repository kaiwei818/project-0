// License codes: making them, and checking them.
//
// A code looks like "WL-7K3F-Q9XM": 8 random characters from an alphabet
// without look-alikes (no 0/O, 1/I/L), so it is easy to read out or type.
// 31^8 is about 850 billion possible codes, and wrong guesses are rate
// limited, so guessing one is hopeless.

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const MAX_FAILURES = 10;         // wrong codes allowed...
const WINDOW_SECONDS = 15 * 60;  // ...per 15 minutes, per IP address

export function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `WL-${chars.slice(0, 4)}-${chars.slice(4)}`;
}

// People type codes in all sorts of ways: "wl 7k3f q9xm", "WL7K3FQ9XM"...
export function normalizeCode(text) {
  const raw = String(text || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("WL") ? raw.slice(2) : raw;
  return body.length === 8 ? `WL-${body.slice(0, 4)}-${body.slice(4)}` : "";
}

// Checks a code for one set. Returns { ok: true, license } or { ok: false, error, status }.
export async function checkCode(request, env, codeText, setId) {
  const ip = request.headers.get("CF-Connecting-IP") || "local";
  const now = Math.floor(Date.now() / 1000);

  const { failures } = await env.DB.prepare(
    `SELECT COUNT(*) AS failures FROM license_attempts WHERE ip = ? AND attempted_at > ?`
  ).bind(ip, now - WINDOW_SECONDS).first();
  if (failures >= MAX_FAILURES) {
    return { ok: false, status: 429, error: "Too many wrong codes. Please wait 15 minutes and try again." };
  }

  const code = normalizeCode(codeText);
  const license = code && await env.DB.prepare(
    `SELECT l.id, l.expires_at, l.max_downloads, l.downloads, l.revoked
     FROM license_codes l
     JOIN license_code_sets ls ON ls.code_id = l.id AND ls.set_id = ?
     WHERE l.code = ?`
  ).bind(setId, code).first();

  if (!license) {
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO license_attempts (ip, attempted_at) VALUES (?, ?)`).bind(ip, now),
      env.DB.prepare(`DELETE FROM license_attempts WHERE attempted_at <= ?`).bind(now - WINDOW_SECONDS),
    ]);
    // Same answer whether the code does not exist or is for another set.
    return { ok: false, status: 403, error: "This code is not valid for this set." };
  }
  if (license.revoked) return { ok: false, status: 403, error: "This code has been switched off." };
  if (license.expires_at && license.expires_at < now) return { ok: false, status: 403, error: "This code has expired." };
  if (license.max_downloads !== null && license.downloads >= license.max_downloads) {
    return { ok: false, status: 403, error: "This code has no downloads left." };
  }
  return { ok: true, license };
}

export function downloadsLeft(license) {
  return license.max_downloads === null ? null : license.max_downloads - license.downloads;
}
