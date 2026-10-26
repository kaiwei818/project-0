// Set page. The server already put the title, description, and photo grid into
// the page (see functions/sets/[slug].js), so there is nothing to download or
// build here. This script makes the photos clickable (tapping one opens the
// full-screen viewer) and handles license codes.

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

const thumbs = document.querySelectorAll("#photo-grid .thumb-button");
const lightbox = createLightbox(photos, {
  downloadUrl: (photo) =>
    licenseCode && photo.downloadable ? `/api/download/${photo.id}?code=${encodeURIComponent(licenseCode)}` : "",
  thumbFor: (index) => thumbs[index] || null,
});

const licenseForm = document.getElementById("license-form");
const downloadable = photos.filter((p) => p.downloadable);
let downloadsLeft = null; // null: no limit (or not known yet)

if (licenseForm) {
  if (licenseCode) {
    showUnlocked(null);
    // Ask again quietly: the code may have been switched off, or used up, since.
    checkCode(licenseCode).then((data) => {
      if (data.ok) showUnlocked(data.downloads_left);
      else forgetCode(data.error);
    });
  }
  licenseForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const error = document.getElementById("license-error");
    error.textContent = "";
    const code = document.getElementById("license-code").value;
    const data = await checkCode(code);
    if (!data.ok) {
      error.textContent = data.error;
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

async function checkCode(code) {
  try {
    const response = await fetch("/api/license/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, slug }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error || "Could not check the code. Please try again." };
    return { ok: true, downloads_left: data.downloads_left ?? null };
  } catch {
    return { ok: false, error: "Could not check the code. Please try again." };
  }
}

// The saved code stopped working: go back to the empty form, with the reason.
function forgetCode(reason) {
  licenseCode = "";
  try {
    sessionStorage.removeItem(`license:${slug}`);
  } catch {}
  licenseForm.hidden = false;
  document.getElementById("license-panel").classList.remove("unlocked");
  document.getElementById("download-all-row").hidden = true;
  document.getElementById("license-help").textContent =
    "Enter the code you received to download full-quality copies without the watermark.";
  document.getElementById("license-error").textContent = reason;
  lightbox.refresh();
}

function showUnlocked(left) {
  downloadsLeft = left;
  const count = downloadable.length;
  const limit = left === null || left === undefined ? "" : ` You have ${left} ${left === 1 ? "download" : "downloads"} left.`;
  document.getElementById("license-help").textContent =
    `Code accepted. Open a photo and use the Download button, or download them all at once (${count} ${count === 1 ? "photo" : "photos"} available).${limit}`;
  licenseForm.hidden = true;
  document.getElementById("license-panel").classList.add("unlocked");

  // "Download all": every photo counts as one download toward the code's limit.
  const row = document.getElementById("download-all-row");
  const button = document.getElementById("download-all");
  const status = document.getElementById("download-all-status");
  row.hidden = count < 2;
  button.textContent = `Download all ${count} (.zip)`;
  const enough = left === null || left === undefined || left >= count;
  button.disabled = !enough;
  status.textContent = enough ? "" : `Needs ${count} downloads; your code has ${left} left. Download photos one by one instead.`;
}

// ---------- Download all ----------
// The photos are fetched one by one (each is checked and counted by the server,
// exactly like a single download), then packed into one .zip in the browser.
document.getElementById("download-all")?.addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const status = document.getElementById("download-all-status");
  button.disabled = true;
  const files = [];
  let problem = "";
  for (const [n, photo] of downloadable.entries()) {
    status.textContent = `Downloading ${n + 1} of ${downloadable.length}...`;
    try {
      const response = await fetch(`/api/download/${photo.id}?code=${encodeURIComponent(licenseCode)}&all=1`);
      if (!response.ok) {
        problem = await response.text();
        break;
      }
      // The server names each file; keep that name inside the .zip.
      const name = /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || `${slug}-${photo.id}.jpg`;
      files.push({ name, blob: await response.blob() });
    } catch {
      problem = "The connection was interrupted.";
      break;
    }
  }

  if (files.length) {
    status.textContent = "Making the .zip file...";
    const { makeZip } = await import("./zip.js");
    const zip = await makeZip(files);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(zip);
    link.download = `${slug}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
  }
  const message = problem
    ? `Stopped after ${files.length} of ${downloadable.length}: ${problem}${files.length ? " The ones that worked are in the .zip." : ""}`
    : `Done: ${files.length} photos saved as ${slug}.zip.`;

  // Update the number of downloads left (a used-up code fails this check).
  const data = await checkCode(licenseCode);
  if (data.ok) showUnlocked(data.downloads_left);
  else button.disabled = true;
  status.textContent = message;
});

for (const button of thumbs) {
  const index = Number(button.dataset.index);
  button.addEventListener("click", () => lightbox.open(index, button));

  // Remember which file the grid picture used, so the viewer can show it
  // instantly while the large version loads.
  const img = button.querySelector("img");
  const remember = () => (photos[index].gridSrc = img.currentSrc);
  if (img.complete) remember();
  else img.addEventListener("load", remember);
}

// A link to one photo (/sets/kyoto?photo=3, from sharing or a reload) opens it.
// The address first goes back to the plain set page, so Back then closes the
// viewer and stays on the set, instead of leaving the site.
// After a reload with a photo open, the history entry is already the viewer's
// own: reopen it without adding another.
const shared = Number(new URLSearchParams(location.search).get("photo")) - 1;
if (photos[shared]) {
  const reloaded = Boolean(history.state?.lightbox);
  if (!reloaded) history.replaceState(null, "", location.pathname);
  lightbox.open(shared, thumbs[shared], { instant: true, push: !reloaded });
}

// Right-click and long-press saving are blocked for the whole site in protect.js.
