// The fingerprint of the site's CSS and JS files (see "Fresh styles and
// scripts" in functions/_middleware.js).
//
// npm run deploy (scripts/deploy.mjs) writes the real fingerprint here just for
// the upload, then puts this empty value back, so in git it is always empty.
// Empty means plain /css/ and /js/ addresses, which is what "npm run dev" and a
// deploy without the script use.
export const ASSET_VERSION = "";
