// Set page: read the slug from the URL (/sets/<slug>), ask the API for that set,
// then build the thumbnail grid. Tapping a photo opens the full-screen viewer.

import { createLightbox } from "./lightbox.js";

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

  const lightbox = createLightbox(set.photos);
  set.photos.forEach((photo, index) => {
    grid.append(createThumb(photo, index, lightbox));
  });
  status.remove();
}

function createThumb(photo, index, lightbox) {
  const item = document.createElement("li");
  // The photo's shape, used by the CSS to reserve exactly the right space.
  item.style.setProperty("--ratio", (photo.width / photo.height).toFixed(4));

  // A <button> (not a plain image) so keyboard users can Tab to it and press Enter.
  const button = document.createElement("button");
  button.type = "button";
  button.className = "thumb-button";
  button.setAttribute("aria-label", `View photo ${index + 1}${photo.alt_text ? `: ${photo.alt_text}` : ""}`);
  button.addEventListener("click", () => lightbox.open(index, button));

  const img = document.createElement("img");
  img.src = `/img/${photo.thumb_key}`;
  img.alt = ""; // the button's label already describes it
  img.loading = "lazy"; // only download when scrolled near
  img.width = photo.width;
  img.height = photo.height;
  img.draggable = false;

  button.append(img);
  item.append(button);
  return item;
}

// A light deterrent from the spec: no right-click "Save Image" on photos.
// It only stops casual saving; screenshots and developer tools still work.
document.addEventListener("contextmenu", (event) => {
  if (event.target.tagName === "IMG") event.preventDefault();
});

loadSet().catch((error) => {
  console.error(error);
  status.textContent = "Could not load this set. Please try again later.";
});
