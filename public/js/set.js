// Set page: read the slug from the URL (/sets/<slug>), ask the API for that set,
// then build the thumbnail grid. Step 7 adds the lightbox viewer.

const grid = document.getElementById("photo-grid");
const status = document.getElementById("status");

async function loadSet() {
  const slug = decodeURIComponent(location.pathname.split("/").pop());
  const response = await fetch(`/api/sets/${encodeURIComponent(slug)}`);

  if (response.status === 404) {
    status.textContent = "This set does not exist.";
    return;
  }
  if (!response.ok) throw new Error(`API returned ${response.status}`);

  const set = await response.json();
  document.getElementById("set-title").textContent = set.title;
  document.getElementById("set-description").textContent = set.description;

  for (const photo of set.photos) {
    grid.append(createThumb(photo));
  }
  status.remove();
}

function createThumb(photo) {
  const item = document.createElement("li");
  // The photo's shape, used by the CSS to reserve exactly the right space.
  item.style.setProperty("--ratio", (photo.width / photo.height).toFixed(4));
  const img = document.createElement("img");
  img.src = `/img/${photo.thumb_key}`;
  img.alt = photo.alt_text;
  img.loading = "lazy"; // only download when scrolled near
  img.width = photo.width;
  img.height = photo.height;
  item.append(img);
  return item;
}

loadSet().catch((error) => {
  console.error(error);
  status.textContent = "Could not load this set. Please try again later.";
});
