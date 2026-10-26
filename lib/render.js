// Builds the HTML for set cards and photo thumbnails ON THE SERVER, so the
// pages arrive complete. Search engines (and link previews) read that first
// version of the page; when it said only "Loading...", Google decided the page
// was empty and refused to index it ("Soft 404").
//
// The image-size choices (srcset) come from public/js/images.js, the same file
// the browser uses, so both always agree.

import { gridSrcset, img, viewerSrcset } from "../public/js/images.js";
import { PLACEHOLDER_MAX, PLACEHOLDER_PATTERN } from "../public/js/placeholder.js";

// A photo's tiny blurry preview (migrations/0010), or "" when it has none or
// it is not the small image data: address it should be. Checked on the way in
// (upload, edit) and again on the way out, since it goes into the page's CSS.
export function cleanPlaceholder(value) {
  const text = String(value ?? "");
  return text.length <= PLACEHOLDER_MAX && PLACEHOLDER_PATTERN.test(text) ? text : "";
}

// style="--ph: url('data:...')" for an element that shows the preview
// (see "Blurry previews" in style.css), or nothing.
function placeholderSpan(value) {
  const ph = cleanPlaceholder(value);
  return ph ? `<span class="placeholder" aria-hidden="true" style="--ph: url('${ph}')"></span>` : "";
}

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

// "2026-03-15" or "2026-03-15 08:30:00" -> "March 2026".
export function monthYear(date) {
  const match = /^(\d{4})-(\d{2})/.exec(date || "");
  if (!match) return "";
  const months = ["January", "February", "March", "April", "May", "June", "July",
    "August", "September", "October", "November", "December"];
  return `${months[Number(match[2]) - 1] || ""} ${match[1]}`.trim();
}

// One card on the home page: a large cover photo with the title, date, and
// photo count on top of it. The first few load right away (they are on screen
// at once); the rest only when scrolled near.
export function setCardHtml(set, index) {
  let image = "";
  if (set.cover_thumb_key) {
    const srcset = gridSrcset(
      { width: set.cover_width, height: set.cover_height },
      { small_key: set.cover_small_key, thumb_key: set.cover_thumb_key }
    );
    const later = index >= 4; // below the first screen: load when near, fade in
    image = placeholderSpan(set.cover_placeholder) +
      `<img${later ? ` class="fade"` : ""} src="${escapeHtml(img(set.cover_thumb_key))}"` +
      (srcset ? ` srcset="${escapeHtml(srcset)}" sizes="(max-width: 700px) calc(100vw - 32px), (max-width: 1100px) 50vw, 400px"` : "") +
      (later ? ` loading="lazy" decoding="async"` : "") +
      ` draggable="false" alt="">`; // decorative: the title already names the set
  }
  const count = `${set.photo_count} ${set.photo_count === 1 ? "photo" : "photos"}`;
  const date = monthYear(set.date);
  return `<li><a class="set-card${image ? "" : " no-cover"}" href="/sets/${encodeURIComponent(set.slug)}">` +
    image +
    `<span class="set-card-text">` +
    `<h2>${escapeHtml(set.title)}</h2>` +
    `<span class="set-card-meta">${date ? `<span>${escapeHtml(date)}</span>` : ""}` +
    (set.location ? `<span>${escapeHtml(set.location)}</span>` : "") + `<span>${count}</span></span>` +
    `</span></a></li>`;
}

// The big picture at the top of the home page: the cover of your first set
// (change it by moving another set to the top on the admin page), with your
// tagline over it and a link into that set.
export function heroHtml(set, tagline, label = "Featured") {
  const photo = { width: set.cover_width, height: set.cover_height, medium_key: set.cover_medium_key, display_key: set.cover_display_key };
  const srcset = viewerSrcset(photo);
  const src = set.cover_medium_key || set.cover_display_key || set.cover_thumb_key;
  return placeholderSpan(set.cover_placeholder) +
    `<img class="hero-image" src="${escapeHtml(img(src))}"` +
    (srcset ? ` srcset="${escapeHtml(srcset)}" sizes="100vw"` : "") +
    ` fetchpriority="high" draggable="false" alt="">` +
    `<div class="hero-text">` +
    `<p class="hero-tagline">${escapeHtml(tagline)}</p>` +
    `<a class="hero-link" href="/sets/${encodeURIComponent(set.slug)}">` +
    `<span class="hero-label">${escapeHtml(label)}</span> ${escapeHtml(set.title)} <span aria-hidden="true">→</span></a>` +
    `</div>`;
}

// One card in "Related sets" at the bottom of a set page: cover, title, and
// why it is related (see lib/related.js).
export function relatedCardHtml(set) {
  const srcset = gridSrcset(
    { width: set.cover_width, height: set.cover_height },
    { small_key: set.cover_small_key, thumb_key: set.cover_thumb_key }
  );
  const count = `${set.photo_count} ${set.photo_count === 1 ? "photo" : "photos"}`;
  return `<li><a class="set-card" href="/sets/${encodeURIComponent(set.slug)}">` +
    placeholderSpan(set.cover_placeholder) +
    `<img class="fade" src="${escapeHtml(img(set.cover_thumb_key))}"` +
    (srcset ? ` srcset="${escapeHtml(srcset)}" sizes="(max-width: 700px) calc(100vw - 32px), 300px"` : "") +
    ` loading="lazy" decoding="async" draggable="false" alt="">` +
    `<span class="set-card-text"><h3>${escapeHtml(set.title)}</h3>` +
    `<span class="set-card-meta">${set.reason ? `<span>${escapeHtml(set.reason)}</span>` : ""}<span>${count}</span></span>` +
    `</span></a></li>`;
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
    placeholderSpan(photo.placeholder) +
    // The first rows are on screen at once: they load first and simply appear
    // (a fade would make the page count as "shown" later). The rest load when
    // scrolled near, and fade in over their blurry preview.
    `<img${index >= 6 ? ` class="fade"` : ""} src="${escapeHtml(img(photo.thumb_key))}"` +
    (srcset ? ` srcset="${escapeHtml(srcset)}" sizes="${sizes}"` : "") +
    ` width="${photo.width}" height="${photo.height}"` +
    (index >= 6 ? ` loading="lazy" decoding="async"` : index < 2 ? ` fetchpriority="high"` : "") +
    ` draggable="false" alt="${escapeHtml(photo.alt_text)}">` +
    `</button></li>`;
}
