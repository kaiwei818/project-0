// Makes saving the photos on public pages harder (a deterrent, not a lock:
// screenshots and developer tools always work, which is why every picture
// visitors see is resized and watermarked).
//
// Together with the "Photo protection" rules in style.css, this stops:
//   - right-click "Save Image As" on computers
//   - long press "Save to Photos" / "Download image" on phones (Android sends
//     the same "contextmenu" event as a right-click; iPhones are handled in CSS)
//   - dragging a picture to the desktop
// Loaded on every public page.

(function () {
  const isPhoto = (target) => target instanceof Element && target.closest("img, .thumb-button, .set-card, .hero, .lightbox-stage");

  document.addEventListener("contextmenu", (event) => {
    if (isPhoto(event.target)) event.preventDefault();
  });
  document.addEventListener("dragstart", (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });
})();
