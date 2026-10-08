// Home page: ask the API for the list of sets, then build one card per set.

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
    img.src = `/img/${set.cover_thumb_key}`;
    img.alt = ""; // decorative: the title below already names the set
    img.loading = "lazy";
    link.append(img);
  }

  const title = document.createElement("h2");
  title.textContent = set.title; // textContent never runs HTML, so it is safe

  const count = document.createElement("p");
  count.className = "count";
  count.textContent = `${set.photo_count} ${set.photo_count === 1 ? "photo" : "photos"}`;

  link.append(title, count);
  item.append(link);
  return item;
}

loadSets().catch((error) => {
  console.error(error);
  status.textContent = "Could not load the sets. Please try again later.";
});
