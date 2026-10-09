// Full-screen photo viewer ("lightbox").
//
// Open it by tapping a photo. Then:
//   next / previous   swipe left or right, the arrow keys, or the < > buttons
//   close             swipe down, Escape, the × button, or the phone's Back button
//
// It uses the built-in <dialog> element, which gives us for free: showing on top
// of everything, closing on Escape, and keeping keyboard focus inside while open.

import { img as imageUrl, viewerSrcset } from "./images.js";

const SWIPE_DISTANCE = 50; // pixels a finger must travel to count as a swipe

export function createLightbox(photos) {
  const dialog = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  const info = document.getElementById("lightbox-info");
  const caption = document.getElementById("lightbox-caption");
  const camera = document.getElementById("lightbox-camera");
  const counter = document.getElementById("lightbox-counter");
  const prevButton = document.getElementById("lightbox-prev");
  const nextButton = document.getElementById("lightbox-next");
  let index = 0;
  let returnFocusTo = null;

  function show(newIndex) {
    index = (newIndex + photos.length) % photos.length; // wrap around at the ends
    const photo = photos[index];

    // Show the grid picture at once (already downloaded, so instant), then swap
    // in the large version as soon as it arrives. No blank screen while waiting.
    img.removeAttribute("srcset");
    img.src = photo.gridSrc || imageUrl(photo.thumb_key);
    img.alt = photo.alt_text;
    const large = loadLarge(photo);
    large.onload = () => {
      if (photos[index] === photo) img.src = large.currentSrc || large.src; // still on this photo?
    };

    caption.textContent = photo.caption;
    caption.hidden = !photo.caption;
    camera.textContent = photo.camera_info || "";
    camera.hidden = !photo.camera_info;
    info.hidden = caption.hidden && camera.hidden;
    counter.textContent = `${index + 1} / ${photos.length}`;
    const single = photos.length === 1;
    prevButton.hidden = nextButton.hidden = single;

    preload(index + 1);
    preload(index - 1);
  }

  // Start downloading the neighbors, so swiping to them feels instant.
  function preload(i) {
    loadLarge(photos[(i + photos.length) % photos.length]);
  }

  // The viewer fills the screen, so "sizes" is the screen width. The browser
  // then picks the 2000 px version on phones and the 3000 px one on big screens.
  function loadLarge(photo) {
    const large = new Image();
    large.sizes = "100vw";
    large.srcset = viewerSrcset(photo); // empty for older photos: then src is used
    large.src = imageUrl(photo.display_key);
    return large;
  }

  function open(startIndex, opener) {
    returnFocusTo = opener;
    show(startIndex);
    dialog.showModal();
    document.body.classList.add("no-scroll");
    // Add a history entry, so the phone's Back button closes the viewer
    // instead of leaving the page.
    history.pushState({ lightbox: true }, "");
  }

  // Every way of closing ends up here (through "popstate" or the dialog's
  // own "close" event), so the cleanup happens exactly once.
  function onClosed() {
    document.body.classList.remove("no-scroll");
    returnFocusTo?.focus(); // put keyboard users back where they were
  }

  function close() {
    if (history.state?.lightbox) history.back(); // triggers popstate below
    else if (dialog.open) dialog.close();
  }

  window.addEventListener("popstate", () => {
    if (dialog.open) dialog.close();
  });
  dialog.addEventListener("close", () => {
    if (history.state?.lightbox) history.back(); // closed with Escape
    onClosed();
  });

  document.getElementById("lightbox-close").addEventListener("click", close);
  prevButton.addEventListener("click", () => show(index - 1));
  nextButton.addEventListener("click", () => show(index + 1));

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(index - 1);
    if (event.key === "ArrowRight") show(index + 1);
  });

  // Tapping the dark area around the photo closes the viewer.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog || event.target.classList.contains("lightbox-stage")) close();
  });

  // ---------- Swipes ----------
  let start = null;
  dialog.addEventListener("pointerdown", (event) => {
    start = { x: event.clientX, y: event.clientY };
  });
  dialog.addEventListener("pointerup", (event) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = null;
    if (Math.abs(dx) > SWIPE_DISTANCE && Math.abs(dx) > Math.abs(dy)) {
      show(dx < 0 ? index + 1 : index - 1); // finger moved left: next photo
    } else if (dy > SWIPE_DISTANCE * 2 && Math.abs(dy) > Math.abs(dx)) {
      close(); // swipe down
    }
  });

  return { open };
}
