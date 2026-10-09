// Set page. The server already put the title, description, and photo grid into
// the page (see functions/sets/[slug].js), so there is nothing to download or
// build here. This script makes the photos clickable (tapping one opens the
// full-screen viewer), runs the Slideshow button, and handles license codes.

import { createLightbox } from "./lightbox.js";

// The photo details (all sizes, captions, camera info), sent along in the page.
const photos = JSON.parse(document.getElementById("set-data").textContent);
const slug = decodeURIComponent(location.pathname.split("/").pop());

// ---------- Licensed downloads ----------
// After a valid code is entered, photos with a clean copy get a Download button
// in the viewer. The code is remembered only in this browser tab (sessionStorage),
// and the server checks it again on every download.
let licenseCode = "";
try {
  licenseCode = sessionStorage.getItem(`license:${slug}`) || "";
} catch {}

const lightbox = createLightbox(photos, {
  downloadUrl: (photo) =>
    licenseCode && photo.downloadable ? `/api/download/${photo.id}?code=${encodeURIComponent(licenseCode)}` : "",
});

const licenseForm = document.getElementById("license-form");
if (licenseForm) {
  if (licenseCode) showUnlocked(null);
  licenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = document.getElementById("license-error");
    error.textContent = "";
    const code = document.getElementById("license-code").value;
    const response = await fetch("/api/license/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, slug }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      error.textContent = data.error || "Could not check the code. Please try again.";
      return;
    }
    licenseCode = code;
    try {
      sessionStorage.setItem(`license:${slug}`, code);
    } catch {}
    showUnlocked(data.downloads_left);
    lightbox.refresh();
  });
}

function showUnlocked(left) {
  const count = photos.filter((p) => p.downloadable).length;
  const limit = left === null || left === undefined ? "" : ` You have ${left} ${left === 1 ? "download" : "downloads"} left.`;
  document.getElementById("license-help").textContent =
    `Code accepted. Open a photo and use the Download button (${count} ${count === 1 ? "photo" : "photos"} available).${limit}`;
  licenseForm.hidden = true;
  document.getElementById("license-panel").classList.add("unlocked");
}

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

// The Slideshow button: opens the viewer at the first photo and starts playing.
const slideshowButton = document.getElementById("slideshow-button");
if (photos.length > 1) {
  slideshowButton.hidden = false;
  slideshowButton.addEventListener("click", () => lightbox.open(0, slideshowButton, { slideshow: true }));
}

// A light deterrent from the spec: no right-click "Save Image" on photos.
// It only stops casual saving; screenshots and developer tools still work.
document.addEventListener("contextmenu", (event) => {
  if (event.target.tagName === "IMG") event.preventDefault();
});
