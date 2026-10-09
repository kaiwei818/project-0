// Admin page for one set: edit its details, upload photos, and manage the
// photos already in it (order, cover, captions, delete).
//
// The journey of each photo:
//   waiting -> processing (in a Web Worker) -> ready (preview shown)
//           -> uploading -> done
// Two photos are processed at a time. More would not be faster (your computer
// has a limited number of cores) but would use a lot more memory. If a photo
// fails (usually because the browser ran out of image memory, which happens in
// Safari), it is retried once automatically, and from then on photos are
// processed one at a time.
// Uploads go one at a time, so the photos keep the order you chose them in:
// the server adds each photo after the last one it received.

import { currentIds, makeSortable, moveItem } from "./sortable.js";

let parallel = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const setId = Number(new URLSearchParams(location.search).get("id"));

const $ = (id) => document.getElementById(id);
const baseTitle = document.title; // "Set · Admin | winstonlens"
const wmOn = $("wm-on");
const keepClean = $("keep-clean");
const wmText = $("wm-text");
const wmStyleInputs = [...document.querySelectorAll('input[name="wm-style"]')];

let set = null;
let items = [];          // every photo in the list, with its status
let processing = 0;      // how many are in a worker right now
let uploading = 0;       // how many are being sent right now
let uploadStarted = false;
const idleWorkers = [];  // workers are reused, since starting one takes time
let nextId = 1;

// ---------- Load the set ----------

async function loadSet() {
  const response = await fetch(`/api/admin/sets/${setId}`);
  if (response.status === 401) return (location.href = "/admin/login");
  if (!response.ok) {
    $("set-title").textContent = "Set not found";
    return;
  }
  set = await response.json();
  showDetails();
  renderExisting();
  loadCategories();
}

// ---------- Categories ----------

async function loadCategories() {
  const response = await fetch("/api/admin/categories");
  if (!response.ok) return;
  const categories = await response.json();
  $("category-empty").hidden = categories.length > 0;
  $("category-boxes").replaceChildren(...categories.map((category) => {
    const label = document.createElement("label");
    label.className = "checkbox";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.value = category.id;
    box.checked = set.category_ids.includes(category.id);
    // Saves straight away, like the other details.
    box.addEventListener("change", saveCategories);
    label.append(box, ` ${category.name}`);
    return label;
  }));
}

async function saveCategories() {
  const ids = [...$("category-boxes").querySelectorAll("input:checked")].map((box) => Number(box.value));
  const response = await fetch(`/api/admin/sets/${setId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category_ids: ids }),
  });
  if (!response.ok) return alert("Could not save the categories. Please try again.");
  set.category_ids = ids;
  flash($("details-status"), "Saved");
}

// ---------- Set details ----------

// sent: what a save just sent. Boxes you typed in since then are left alone,
// so nothing you type is lost when a save finishes.
function showDetails(sent = null) {
  $("set-title").textContent = set.title;
  document.title = baseTitle.replace(/^Set/, set.title);
  $("view-link").href = $("preview-link").href = `/sets/${encodeURIComponent(set.slug)}`;
  showVisibility();
  for (const [id, field] of [["details-title", "title"], ["details-slug", "slug"], ["details-description", "description"], ["details-date", "shot_date"]]) {
    if (!sent || $(id).value === sent[field]) $(id).value = set[field];
  }
}

$("details-form").addEventListener("submit", (event) => {
  event.preventDefault();
  saveDetails();
});

// Like captions, the details also save by themselves when you leave a box
// after changing it, so nothing typed gets lost if you forget the button.
for (const id of ["details-title", "details-slug", "details-description", "details-date"]) {
  $(id).addEventListener("change", () => {
    if ($(id).checkValidity()) saveDetails(); // skip an empty title or address
  });
}

// Saves run one after another, never at the same time. Otherwise, when you move
// quickly between boxes, an older save could finish last and undo a newer one.
let saving = Promise.resolve();
function saveDetails() {
  saving = saving.then(saveDetailsNow, saveDetailsNow);
  return saving;
}

async function saveDetailsNow() {
  const status = $("details-status");
  const sent = {
    title: $("details-title").value,
    slug: $("details-slug").value,
    description: $("details-description").value,
    shot_date: $("details-date").value,
  };
  const response = await fetch(`/api/admin/sets/${setId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sent),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    status.textContent = data.error || "Could not save.";
    status.dataset.state = "error";
    return;
  }
  Object.assign(set, data);
  showDetails(sent); // shows the cleaned-up web address, e.g. "My Trip!" -> "my-trip"
  flash(status, "Saved");
}

// ---------- Draft / published ----------

function showVisibility() {
  const published = Boolean(set.published);
  $("publish-text").textContent = published
    ? "Published: everyone can see this set."
    : "Draft: only you can see this set (use Preview while logged in). Visitors and search engines cannot.";
  $("publish-button").textContent = published ? "Unpublish (back to draft)" : "Publish";
  $("publish-button").className = published ? "button-secondary" : "";
  $("set-title").dataset.state = published ? "published" : "draft";
}

$("publish-button").addEventListener("click", async () => {
  const publish = !set.published;
  if (publish && set.photos.length === 0 &&
      !confirm("This set has no photos yet. Publish it anyway?")) return;

  const response = await fetch(`/api/admin/sets/${setId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published: publish }),
  });
  if (!response.ok) return alert("Could not change the visibility. Please try again.");
  Object.assign(set, await response.json());
  showVisibility();
});

// Shows a short message like "Saved" next to a field, then fades it.
function flash(element, text) {
  element.textContent = text;
  element.dataset.state = "ok";
  clearTimeout(element.timer);
  element.timer = setTimeout(() => (element.textContent = ""), 2000);
}

// ---------- Photos already in the set ----------

const existing = $("existing");
makeSortable(existing, { onChange: savePhotoOrder });

function renderExisting() {
  existing.replaceChildren(...set.photos.map(createPhotoCard));
  $("existing-empty").hidden = set.photos.length > 0;
  $("existing-help").hidden = set.photos.length === 0;
}

function createPhotoCard(photo, index) {
  const item = document.createElement("li");
  item.className = "photo-card";
  item.dataset.id = photo.id;
  const isCover = coverId() === photo.id;
  if (isCover) item.classList.add("is-cover");

  // With a mouse, drag the picture itself. With a finger, drag the ⠿ grip, so
  // touching a picture can still scroll the page (see sortable.js).
  const figure = document.createElement("div");
  figure.className = "photo-card-image";
  const img = document.createElement("img");
  img.src = `/img/${photo.thumb_key}`;
  img.alt = "";
  img.loading = "lazy";
  img.draggable = false; // turn off the browser's own image dragging
  img.className = "drag-surface";
  img.title = "Drag to reorder";
  const grip = document.createElement("span");
  grip.className = "drag-handle photo-grip";
  grip.textContent = "⠿";
  grip.title = "Drag to reorder";
  grip.setAttribute("aria-hidden", "true");
  figure.append(img, grip);
  if (isCover) {
    const badge = document.createElement("span");
    badge.className = "cover-badge";
    badge.textContent = "Cover";
    figure.append(badge);
  }
  if (photo.downloadable) {
    const badge = document.createElement("span");
    badge.className = "download-badge";
    badge.textContent = "Downloadable";
    badge.title = "A clean copy is stored for visitors with a license code";
    figure.append(badge);
  }

  const caption = textField(photo, "caption", "Caption (shown in the viewer)");
  const camera = textField(photo, "camera_info", "Camera details (shown in the viewer; clear to hide)");
  const alt = textField(photo, "alt_text", "Description for blind visitors (alt text)");

  const tools = document.createElement("div");
  tools.className = "photo-card-tools";
  const number = index + 1;
  tools.append(
    toolButton("←", `Move photo ${number} earlier`, () => movePhoto(item, -1, "←")),
    toolButton("→", `Move photo ${number} later`, () => movePhoto(item, 1, "→")),
    toolButton(isCover ? "★" : "☆", isCover ? `Photo ${number} is the cover` : `Make photo ${number} the cover`,
      () => setCover(photo), isCover ? "active" : ""),
    ...(photo.downloadable
      ? [toolButton("⤓", `Stop photo ${number} being downloadable (deletes its clean copy)`, () => removeDownload(photo))]
      : []),
    toolButton("×", `Delete photo ${number}`, () => deletePhoto(photo), "danger"),
  );

  item.append(figure, caption, camera, alt, tools);
  return item;
}

// The cover is the chosen photo, or the first photo when none was chosen.
function coverId() {
  return set.cover_photo_id ?? set.photos[0]?.id;
}

function textField(photo, field, labelText) {
  const label = document.createElement("label");
  label.className = "photo-card-field";
  const span = document.createElement("span");
  span.textContent = labelText;
  const input = document.createElement("input");
  input.type = "text";
  input.value = photo[field];
  input.maxLength = { caption: 1000, alt_text: 500, camera_info: 200 }[field];
  const status = document.createElement("span");
  status.className = "save-status";
  status.setAttribute("role", "status");

  // "change" fires when you leave the box after typing, not on every key.
  input.addEventListener("change", async () => {
    const response = await fetch(`/api/admin/photos/${photo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: input.value }),
    });
    if (!response.ok) {
      status.textContent = "Not saved, try again";
      status.dataset.state = "error";
      return;
    }
    photo[field] = (await response.json())[field];
    flash(status, "Saved");
  });

  label.append(span, input, status);
  return label;
}

function toolButton(text, label, onClick, variant = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button ${variant}`;
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.addEventListener("click", onClick);
  return button;
}

async function movePhoto(item, direction, arrow) {
  if (!moveItem(item, direction)) return;
  await savePhotoOrder();
  // Redrawing replaced the buttons. Put focus back on the same arrow of the same
  // photo, so a keyboard user can press Enter again to keep moving it.
  const card = existing.querySelector(`[data-id="${item.dataset.id}"]`);
  [...(card?.querySelectorAll(".icon-button") ?? [])].find((b) => b.textContent === arrow)?.focus();
}

async function savePhotoOrder() {
  const ids = currentIds(existing);
  const response = await fetch(`/api/admin/sets/${setId}/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photo_ids: ids }),
  });
  if (!response.ok) {
    alert("Could not save the new order. The page will reload the photos.");
    return loadSet();
  }
  set.photos.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  // Redraw so the photo numbers in the labels and the default cover stay right.
  renderExisting();
}

async function setCover(photo) {
  const response = await fetch(`/api/admin/sets/${setId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cover_photo_id: photo.id }),
  });
  if (!response.ok) return alert("Could not change the cover. Please try again.");
  set.cover_photo_id = photo.id;
  renderExisting();
}

// ---------- Deleting ----------

async function removeDownload(photo) {
  if (!confirm("Delete this photo's clean copy? It will no longer be downloadable with a license code.\n\nThe photo itself stays.")) return;
  const response = await fetch(`/api/admin/photos/${photo.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ remove_download: true }),
  });
  if (!response.ok) return alert("Could not remove the clean copy. Please try again.");
  photo.downloadable = 0;
  renderExisting();
}

async function deletePhoto(photo) {
  if (!confirm("Delete this photo?\n\nThis cannot be undone.")) return;
  const response = await fetch(`/api/admin/photos/${photo.id}`, { method: "DELETE" });
  if (!response.ok) {
    alert("Could not delete the photo. Please try again.");
    return;
  }
  set.photos = set.photos.filter((p) => p.id !== photo.id);
  if (set.cover_photo_id === photo.id) set.cover_photo_id = null; // the server did the same
  renderExisting();
}

$("delete-set").addEventListener("click", async () => {
  if (!set) return;
  const count = set.photos.length;
  const photos = `${count} ${count === 1 ? "photo" : "photos"}`;
  if (!confirm(`Delete the set "${set.title}" and its ${photos}?\n\nThis cannot be undone.`)) return;

  const response = await fetch(`/api/admin/sets/${set.id}`, { method: "DELETE" });
  if (!response.ok) {
    alert("Could not delete the set. Please try again.");
    return;
  }
  location.href = "/admin/";
});

// ---------- Watermark settings (remembered in this browser) ----------

try {
  wmText.value = localStorage.getItem("watermark-text") ?? "";
  wmOn.checked = localStorage.getItem("watermark-on") !== "false";
  const style = localStorage.getItem("watermark-style") || "full";
  for (const input of wmStyleInputs) input.checked = input.value === style;
} catch {
  // Private browsing can block storage. The page still works without it.
}
for (const input of [wmText, wmOn, ...wmStyleInputs]) {
  input.addEventListener("change", () => {
    try {
      localStorage.setItem("watermark-text", wmText.value);
      localStorage.setItem("watermark-on", String(wmOn.checked));
      localStorage.setItem("watermark-style", watermarkStyle());
    } catch {}
  });
}

// "full" (tiled across the photo) or "small" (one line in the corner).
function watermarkStyle() {
  return wmStyleInputs.find((input) => input.checked)?.value || "full";
}

function currentWatermark() {
  return wmOn.checked && wmText.value.trim() ? wmText.value.trim() : "";
}

// ---------- Adding files ----------

$("file-input").addEventListener("change", (event) => {
  addFiles(event.target.files);
  event.target.value = ""; // so choosing the same file again still triggers "change"
});

const dropZone = $("drop-zone");
dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragging");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragging"));
dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragging");
  addFiles(event.dataTransfer.files);
});
// A file dropped anywhere else would make the browser open it and leave this page.
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => event.preventDefault());

function addFiles(fileList) {
  if (!set) return;
  if (uploadStarted && !isBusy()) clearList(); // a finished batch: start fresh

  for (const file of fileList) {
    const item = { id: nextId++, file, status: "waiting", el: createCard(file) };
    if (!ALLOWED_TYPES.includes(file.type)) {
      item.status = "error";
      item.error = "Not a JPEG, PNG, or WebP file.";
    }
    items.push(item);
    $("queue").append(item.el.root);
    renderItem(item);
  }
  $("queue-panel").hidden = items.length === 0;
  pumpProcessing();
  renderSummary();
}

// ---------- Processing in workers ----------

function pumpProcessing() {
  let item;
  while (processing < parallel && (item = items.find((i) => i.status === "waiting"))) {
    processing++;
    item.status = "processing";
    renderItem(item);
    processItem(item).finally(() => {
      processing--;
      pumpProcessing();
      renderSummary();
    });
  }
  renderSummary();
}

async function processItem(item) {
  const worker = idleWorkers.pop() || new Worker("/js/image-worker.js", { type: "module" });
  const result = await new Promise((resolve) => {
    worker.onmessage = (event) => resolve(event.data);
    worker.onerror = () => resolve({ error: "Processing failed." });
    worker.postMessage({ id: item.id, file: item.file, watermark: currentWatermark(), watermarkStyle: watermarkStyle(), keepClean: keepClean.checked });
  });

  if (result.error) {
    // Throw away this worker: a fresh one starts with all of its memory free.
    worker.terminate();
  } else {
    idleWorkers.push(worker);
  }

  if (item.status === "removed") return; // the list was cleared meanwhile
  if (result.error && !item.retried) {
    // First failure: slow down to one photo at a time and try this one again.
    item.retried = true;
    parallel = 1;
    item.status = "waiting";
  } else if (result.error) {
    item.status = "error";
    item.error = result.error;
  } else {
    item.status = "ready";
    item.result = result;
    item.thumbUrl = URL.createObjectURL(result.thumb);
    showPreview();
  }
  renderItem(item);
}

// The first finished photo becomes the big watermark preview.
function showPreview() {
  const preview = $("wm-preview");
  if (!preview.hidden) return;
  const first = items.find((i) => i.result);
  if (!first) return;
  first.displayUrl = URL.createObjectURL(first.result.display);
  $("wm-preview-img").src = first.displayUrl;
  preview.hidden = false;
}

// ---------- Uploading ----------

$("upload-button").addEventListener("click", () => {
  uploadStarted = true;
  pumpUploads();
});

function pumpUploads() {
  let item;
  while (uploading < 1 && (item = items.find((i) => i.status === "ready"))) {
    uploading++;
    item.status = "uploading";
    renderItem(item);
    uploadItem(item).finally(() => {
      uploading--;
      pumpUploads();
      if (!isBusy()) loadSet(); // all done: refresh "Photos in this set"
    });
  }
  renderSummary();
}

async function uploadItem(item) {
  const { width, height, cameraInfo } = item.result;
  const form = new FormData();
  form.append("set_id", setId);
  form.append("width", width);
  form.append("height", height);
  form.append("alt_text", `Photo from ${set.title}`);
  form.append("camera_info", cameraInfo || "");
  for (const size of ["small", "thumb", "medium", "display", "download"]) {
    const blob = item.result[size];
    if (blob) form.append(size, blob, `${size}.${extension(blob)}`);
  }

  try {
    const response = await fetch("/api/admin/photos", { method: "POST", body: form });
    if (response.status === 401) return (location.href = "/admin/login");
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Server said ${response.status}`);
    }
    item.status = "done";
  } catch (err) {
    if (!item.uploadRetried) {
      // Networks hiccup. Try once more before calling it a failure.
      item.uploadRetried = true;
      item.status = "ready";
    } else {
      item.status = "error";
      item.error = `Upload failed: ${err.message}`;
    }
  }
  renderItem(item);
}

// ---------- Retrying ----------

// A photo can be tried again if it is a supported type: either its shrinking
// failed (start over), or its upload failed (send the finished files again).
function canRetry(item) {
  return item.status === "error" && ALLOWED_TYPES.includes(item.file.type);
}

$("retry-button").addEventListener("click", () => {
  for (const item of items.filter(canRetry)) {
    item.status = item.result ? "ready" : "waiting";
    item.retried = item.uploadRetried = false;
    item.error = "";
    renderItem(item);
  }
  pumpProcessing();
  if (uploadStarted) pumpUploads();
});

function extension(blob) {
  return blob.type === "image/webp" ? "webp" : "jpg";
}

// ---------- Clearing ----------

$("clear-button").addEventListener("click", clearList);

function clearList() {
  for (const item of items) {
    if (item.status === "processing") item.status = "removed";
    URL.revokeObjectURL(item.thumbUrl);  // free the memory the previews used
    URL.revokeObjectURL(item.displayUrl);
  }
  items = items.filter((i) => i.status === "uploading"); // let in-flight uploads finish
  $("queue").replaceChildren(...items.map((i) => i.el.root));
  $("wm-preview").hidden = true;
  uploadStarted = items.length > 0;
  $("queue-panel").hidden = items.length === 0;
  renderSummary();
}

// ---------- Drawing the list ----------

function createCard(file) {
  const root = document.createElement("li");
  const img = document.createElement("img");
  img.alt = "";
  const name = document.createElement("p");
  name.className = "queue-name";
  name.textContent = file.name;
  const sizes = document.createElement("p");
  sizes.className = "muted";
  const status = document.createElement("p");
  status.className = "queue-status";
  root.append(img, name, sizes, status);
  return { root, img, sizes, status };
}

const STATUS_TEXT = {
  waiting: "Waiting",
  processing: "Shrinking...",
  ready: "Ready",
  uploading: "Uploading...",
  done: "Uploaded",
};

function renderItem(item) {
  const { root, img, sizes, status } = item.el;
  root.dataset.status = item.status;
  status.textContent = item.status === "error" ? item.error : STATUS_TEXT[item.status];
  if (item.thumbUrl && !img.src) img.src = item.thumbUrl;
  if (item.result) {
    const { small, thumb, medium, display, cameraInfo } = item.result;
    const online = small.size + thumb.size + medium.size + display.size;
    sizes.textContent = `${formatBytes(item.file.size)} → ${formatBytes(online)} online (4 sizes)`;
    if (item.result.download) sizes.textContent += ` + ${formatBytes(item.result.download.size)} private clean copy`;
    if (cameraInfo) sizes.textContent += ` · ${cameraInfo}`;
  }
}

function renderSummary() {
  const count = (status) => items.filter((i) => i.status === status).length;
  const total = items.length;
  const done = count("done");
  const ready = count("ready");
  const errors = count("error");
  const processed = total - count("waiting") - count("processing");

  let text;
  if (count("waiting") + count("processing") > 0) text = `Shrinking photos: ${processed} of ${total} done.`;
  else if (uploading > 0 || (uploadStarted && ready > 0)) text = `Uploading: ${done} of ${total - errors} sent.`;
  else if (uploadStarted) text = `Finished: ${done} uploaded.`;
  else text = `${ready} ${ready === 1 ? "photo" : "photos"} ready. Check the preview, then upload.`;
  if (errors) text += ` ${errors} failed: see the red messages below.`;
  $("queue-summary").textContent = text;
  $("queue-summary").dataset.state = errors ? "error" : "";
  $("retry-button").hidden = !items.some(canRetry) || isBusy();

  // Each photo counts twice: once for shrinking, once for uploading.
  $("queue-progress").max = Math.max(1, (total - errors) * 2);
  $("queue-progress").value = processed - errors + done;

  $("upload-button").disabled = ready === 0 || count("waiting") + count("processing") > 0 || uploading > 0;
  $("upload-button").textContent = `Upload ${ready || ""} ${ready === 1 ? "photo" : "photos"}`.replace("  ", " ");

  // The watermark is baked in while shrinking, so it cannot change mid-batch.
  const locked = isBusy() || ready > 0;
  wmOn.disabled = wmText.disabled = keepClean.disabled = locked;
  for (const input of wmStyleInputs) input.disabled = locked;
}

function isBusy() {
  return processing > 0 || uploading > 0 || items.some((i) => i.status === "waiting");
}

window.addEventListener("beforeunload", (event) => {
  if (isBusy() || items.some((i) => i.status === "ready")) event.preventDefault();
});

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

loadSet().catch((error) => {
  console.error(error);
  $("set-title").textContent = "Could not load this set.";
});
