// npm run deploy: puts the site live on Cloudflare.
//
// 1. Saves a fingerprint of all CSS and JS files in public/asset-version.txt.
//    functions/_middleware.js puts it in the address of every style and script
//    (/v/<fingerprint>/css/style.css), so after a change, browsers see a new
//    address and download the new file instead of using an old saved copy.
// 2. Runs "wrangler pages deploy". Extra words are passed on, for example
//    npm run deploy -- --branch=preview
// 3. Removes the fingerprint file again, so an old one is never left behind.
//    (Without the file, the site still works; it just uses plain addresses.)

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC = fileURLToPath(new URL("../public/", import.meta.url));
const VERSION_FILE = join(PUBLIC, "asset-version.txt");

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
await writeFile(VERSION_FILE, version + "\n");
console.log(`Styles and scripts version: ${version}\n`);

// Ctrl+C stops wrangler; this script then still removes the file.
process.on("SIGINT", () => {});
const result = spawnSync("wrangler", ["pages", "deploy", ...process.argv.slice(2)], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
await rm(VERSION_FILE, { force: true });

if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
