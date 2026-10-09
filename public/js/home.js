// Home page: ask the API for the list of sets, then build one card per set.

import { gridSrcset, img as imageUrl } from "./images.js";

const grid = document.getElementById("set-grid");
const status = document.getElementById("status");

async function loadSets() {
  const response = await fetch("/api/sets");
  if (!response.ok) throw new Error(`API returned ${response.status}`);
  const sets = await response.json();

  if (sets.length === 0) {
    status.textContent = "No sets yet.";
    return;
  }

  for (const set of sets) {
    grid.append(createSetCard(set));
  }
  status.remove();
}

function createSetCard(set) {
  const item = document.createElement("li");
  const link = document.createElement("a");
  link.className = "set-card";
  link.href = `/sets/${encodeURIComponent(set.slug)}`;

  if (set.cover_thumb_key) {
    const img = document.createElement("img");
    // Cards are the full width on phones and about 400 px wide on computers.
    // The browser picks the 800 px or the 1200 px cover from that (see images.js).
    img.sizes = "(max-width: 600px) calc(100vw - 32px), 400px";
    img.srcset = gridSrcset(
      { width: set.cover_width, height: set.cover_height },
      { small_key: set.cover_small_key, thumb_key: set.cover_thumb_key }
    );
    img.src = imageUrl(set.cover_thumb_key);
    img.alt = ""; // decorative: the title below already names the set
    img.loading = "lazy";
    link.append(img);
  }

  const title = document.createElement("h2");
  title.textContent = set.title; // textContent never runs HTML, so it is safe

  const count = document.createElement("p");
  count.className = "count";
  count.textContent = `${set.photo_count} ${set.photo_count === 1 ? "photo" : "photos"}`;

  link.append(title);
  if (set.description) {
    const description = document.createElement("p");
    description.className = "set-card-description";
    description.textContent = set.description;
    link.append(description);
  }
  link.append(count);
  item.append(link);
  return item;
}

loadSets().catch((error) => {
  console.error(error);
  status.textContent = "Could not load the sets. Please try again later.";
});
