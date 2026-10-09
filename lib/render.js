// Builds the HTML for set cards and photo thumbnails ON THE SERVER, so the
// pages arrive complete. Search engines (and link previews) read that first
// version of the page; when it said only "Loading...", Google decided the page
// was empty and refused to index it ("Soft 404").
//
// The image-size choices (srcset) come from public/js/images.js, the same file
// the browser uses, so both always agree.

import { gridSrcset, img } from "../public/js/images.js";

// Turns text into something safe to put inside HTML: a "<" in a title shows
// as "<" and can never become a tag or a script.
export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Data for the page's own JavaScript, inside <script type="application/json">.
// Browsers never run that kind of script. Replacing "<" stops text such as
// "</script>" in a caption from ending the block early.
export function jsonForPage(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// One card on the home page. The first few load right away (they are on screen
// at once); the rest only when scrolled near.
export function setCardHtml(set, index) {
  let image = "";
  if (set.cover_thumb_key) {
    const srcset = gridSrcset(
      { width: set.cover_width, height: set.cover_height },
      { small_key: set.cover_small_key, thumb_key: set.cover_thumb_key }
    );
    image = `<img src="${escapeHtml(img(set.cover_thumb_key))}"` +
      (srcset ? ` srcset="${escapeHtml(srcset)}" sizes="(max-width: 600px) calc(100vw - 32px), 400px"` : "") +
      (index >= 3 ? ` loading="lazy"` : "") +
      ` alt="">`; // decorative: the title below already names the set
  }
  const count = `${set.photo_count} ${set.photo_count === 1 ? "photo" : "photos"}`;
  return `<li><a class="set-card" href="/sets/${encodeURIComponent(set.slug)}">` +
    image +
    `<h2>${escapeHtml(set.title)}</h2>` +
    (set.description ? `<p class="set-card-description">${escapeHtml(set.description)}</p>` : "") +
    `<p class="count">${count}</p></a></li>`;
}

// One photo in a set's grid: a button (so keyboard users can open it) with the
// picture inside. --ratio reserves the right space so nothing jumps while
// loading (see .photo-grid in style.css).
export function photoThumbHtml(photo, index) {
  const ratio = photo.width / photo.height;
  const srcset = gridSrcset(photo);
  // How wide the photo appears: about ratio x row height (160 px on phones,
  // 260 px on computers), plus room for the row stretching to fill the width.
  const sizes = `(max-width: 600px) ${Math.round(ratio * 160 * 1.4)}px, ${Math.round(ratio * 260 * 1.4)}px`;
  const label = `View photo ${index + 1}${photo.alt_text ? `: ${photo.alt_text}` : ""}`;
  return `<li style="--ratio: ${ratio.toFixed(4)}">` +
    `<button type="button" class="thumb-button" data-index="${index}" aria-label="${escapeHtml(label)}">` +
    `<img src="${escapeHtml(img(photo.thumb_key))}"` +
    (srcset ? ` srcset="${escapeHtml(srcset)}" sizes="${sizes}"` : "") +
    ` width="${photo.width}" height="${photo.height}"` +
    (index >= 6 ? ` loading="lazy"` : "") +
    ` draggable="false" alt="${escapeHtml(photo.alt_text)}">` +
    `</button></li>`;
}
