// Security headers: instructions to the browser that limit what a page may do.
// They cost nothing and block whole families of attacks.
//
// The same list is in public/_headers, which Cloudflare applies to plain files
// (index.html, CSS, JS). Pages that our own code builds (the /sets/... pages and
// the /admin pages) do not get those automatically, so they call this instead.
// If you change one list, change the other.

export const SECURITY_HEADERS = {
  // Only load scripts, styles, images, and connections from this site.
  // ("blob:" is for the previews on the upload page.) If an attacker managed
  // to sneak a <script> into a caption, the browser would refuse to run it.
  "Content-Security-Policy": [
    "default-src 'self'",
    "img-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; "),
  // Never show this site inside another site's frame (stops "clickjacking").
  "X-Frame-Options": "DENY",
  // Trust the Content-Type we send; do not guess.
  "X-Content-Type-Options": "nosniff",
  // Tell other sites only our domain when someone follows a link, not the full address.
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // This site never needs the camera, microphone, or location.
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  // Always use HTTPS for the next year. (Browsers ignore this on http://localhost.)
  "Strict-Transport-Security": "max-age=31536000",
};

export function withSecurityHeaders(response) {
  const copy = new Response(response.body, response); // response headers can be read-only
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) copy.headers.set(name, value);
  return copy;
}
