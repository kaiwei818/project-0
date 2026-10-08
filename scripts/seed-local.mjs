// Fills the LOCAL database and bucket with sample sets so the gallery has
// something to show before the upload page exists. Never touches the real site.
//
// Run with: npm run seed:local
//
// The sample "photos" are colored SVG drawings, not real photos. They are tiny and
// need no image library, which keeps this script dependency free.

import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = ".seed";
const SETS = [
  { slug: "coastline", title: "Coastline", description: "Sample set: blue hour along the shore.", hue: 200 },
  { slug: "city-nights", title: "City Nights", description: "Sample set: neon and rain.", hue: 300 },
  { slug: "forest", title: "Forest", description: "Sample set: morning light through the trees.", hue: 120 },
];
const PHOTOS_PER_SET = 6;
// A mix of landscape, portrait, and square shapes, like a real set.
const SHAPES = [[2000, 1333], [1333, 2000], [2000, 1333], [1600, 1600], [2000, 1125], [1333, 2000]];

function svg(width, height, hue, label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="hsl(${hue},55%,62%)"/><stop offset="1" stop-color="hsl(${hue + 40},45%,22%)"/>
  </linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="50%" y="50%" fill="white" fill-opacity="0.8" font-family="sans-serif"
        font-size="${Math.round(width / 12)}" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;
}

function wrangler(...args) {
  execFileSync("npx", ["wrangler", ...args], { stdio: ["ignore", "ignore", "inherit"] });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);

// 1. Write the SVG files and build the SQL that describes them.
const sql = ["DELETE FROM photos;", "DELETE FROM sets;"];
const uploads = [];

SETS.forEach((set, s) => {
  const setId = s + 1;
  sql.push(
    `INSERT INTO sets (id, slug, title, description, sort_order) VALUES ` +
    `(${setId}, '${set.slug}', '${set.title}', '${set.description}', ${s});`
  );
  for (let p = 0; p < PHOTOS_PER_SET; p++) {
    const [w, h] = SHAPES[p % SHAPES.length];
    const label = `${set.title} ${p + 1}`;
    const hue = set.hue + p * 8;
    const thumbKey = `seed/${set.slug}-${p + 1}-thumb.svg`;
    const displayKey = `seed/${set.slug}-${p + 1}-display.svg`;
    const scale = 500 / Math.max(w, h);

    for (const [key, content] of [
      [thumbKey, svg(Math.round(w * scale), Math.round(h * scale), hue, label)],
      [displayKey, svg(w, h, hue, label)],
    ]) {
      const file = join(OUT, key.replace("/", "_"));
      writeFileSync(file, content);
      uploads.push([key, file]);
    }

    sql.push(
      `INSERT INTO photos (set_id, thumb_key, display_key, width, height, alt_text, sort_order) VALUES ` +
      `(${setId}, '${thumbKey}', '${displayKey}', ${w}, ${h}, 'Sample image: ${label}', ${p});`
    );
  }
});

writeFileSync(join(OUT, "seed.sql"), sql.join("\n"));

// 2. Make sure the tables exist, then load the rows.
console.log("Applying migrations to the local database...");
wrangler("d1", "migrations", "apply", "portfolio-db", "--local");
console.log("Inserting sample sets and photos...");
wrangler("d1", "execute", "portfolio-db", "--local", `--file=${join(OUT, "seed.sql")}`);

// 3. Put the files in the local R2 bucket.
console.log(`Uploading ${uploads.length} sample images to the local bucket (this takes a minute)...`);
for (const [key, file] of uploads) {
  wrangler("r2", "object", "put", `portfolio-images/${key}`, "--local",
    `--file=${file}`, "--content-type=image/svg+xml");
}

console.log("Done. Start the site with: npm run dev");
