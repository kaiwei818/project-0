// npm run deploy: puts the site live on Cloudflare.
//
// 1. Writes a fingerprint of all CSS and JS files into lib/asset-version.js.
//    functions/_middleware.js puts it in the address of every style and script
//    (/v/<fingerprint>/css/style.css), so after a change, browsers see a new
//    address and download the new file instead of using an old saved copy.
// 2. Runs "wrangler pages deploy". Extra words are passed on, for example
//    npm run deploy -- --branch=preview
// 3. Puts the empty value back in lib/asset-version.js, so git never sees a
//    change. (A deploy without this script uses the empty value: plain
//    addresses, and browsers may keep old CSS for up to 4 hours.)

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));
const VERSION_MODULE = fileURLToPath(new URL("../lib/asset-version.js", import.meta.url));
// The file as it is in git (also repairs one left filled in by a crash).
const EMPTY = (await readFile(VERSION_MODULE, "utf8")).replace(/ASSET_VERSION = "[0-9a-f]*"/, 'ASSET_VERSION = ""');

async function filesIn(dir) {
  const entries = (await readdir(dir, { withFileTypes: true })).filter((e) => !e.name.startsWith("."));
  const files = await Promise.all(
    entries.map((e) => (e.isDirectory() ? filesIn(join(dir, e.name)) : [join(dir, e.name)])),
  );
  return files.flat();
}

const files = [...(await filesIn(join(PUBLIC, "css"))), ...(await filesIn(join(PUBLIC, "js")))].sort();
const hash = createHash("sha256");
for (const file of files) {
  hash.update(relative(PUBLIC, file).split("\\").join("/"));
  hash.update(await readFile(file));
}
const version = hash.digest("hex").slice(0, 12);
console.log(`Styles and scripts version: ${version}\n`);

// Ctrl+C or closing the window stops wrangler; this script still puts the file back.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(signal, () => {});
let result;
try {
  await writeFile(VERSION_MODULE, EMPTY.replace('ASSET_VERSION = ""', `ASSET_VERSION = "${version}"`));
  // --commit-dirty: wrangler would otherwise warn about the file changed above.
  result = spawnSync("wrangler", ["pages", "deploy", "--commit-dirty=true", ...process.argv.slice(2)], {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
} finally {
  await writeFile(VERSION_MODULE, EMPTY);
}

if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
