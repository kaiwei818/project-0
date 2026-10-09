// Set page. The server already put the title, description, and photo grid into
// the page (see functions/sets/[slug].js), so there is nothing to download or
// build here. This script only makes the photos clickable: tapping one opens the
// full-screen viewer.

import { createLightbox } from "./lightbox.js";

// The photo details (all sizes, captions, camera info), sent along in the page.
const photos = JSON.parse(document.getElementById("set-data").textContent);
const lightbox = createLightbox(photos);

for (const button of document.querySelectorAll("#photo-grid .thumb-button")) {
  const index = Number(button.dataset.index);
  button.addEventListener("click", () => lightbox.open(index, button));

  // Remember which file the grid picture used, so the viewer can show it
  // instantly while the large version loads.
  const img = button.querySelector("img");
  const remember = () => (photos[index].gridSrc = img.currentSrc);
  if (img.complete) remember();
  else img.addEventListener("load", remember);
}

// A light deterrent from the spec: no right-click "Save Image" on photos.
// It only stops casual saving; screenshots and developer tools still work.
document.addEventListener("contextmenu", (event) => {
  if (event.target.tagName === "IMG") event.preventDefault();
});
