// Upload page for one set.
//
// The journey of each photo:
//   waiting -> processing (in a Web Worker) -> ready (preview shown)
//           -> uploading -> done
// Two photos are processed at a time, and two are uploaded at a time. More would
// not be faster (your computer has a limited number of cores, and the network a
// limited speed), but it would use a lot more memory.

const PARALLEL = 2;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const setId = Number(new URLSearchParams(location.search).get("id"));

const $ = (id) => document.getElementById(id);
const wmOn = $("wm-on");
const wmText = $("wm-text");

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
  $("set-title").textContent = set.title;
  document.title = `${set.title} | Admin`;
  $("view-link").href = `/sets/${encodeURIComponent(set.slug)}`;
  renderExisting();
}

function renderExisting() {
  const list = $("existing");
  list.replaceChildren(...set.photos.map((photo) => {
    const item = document.createElement("li");
    const img = document.createElement("img");
    img.src = `/img/${photo.thumb_key}`;
    img.alt = photo.alt_text;
    img.loading = "lazy";
    item.append(img);
    return item;
  }));
  $("existing-empty").hidden = set.photos.length > 0;
}

// ---------- Watermark settings (remembered in this browser) ----------

try {
  wmText.value = localStorage.getItem("watermark-text") ?? "";
  wmOn.checked = localStorage.getItem("watermark-on") !== "false";
} catch {
  // Private browsing can block storage. The page still works without it.
}
for (const input of [wmText, wmOn]) {
  input.addEventListener("change", () => {
    try {
      localStorage.setItem("watermark-text", wmText.value);
      localStorage.setItem("watermark-on", String(wmOn.checked));
    } catch {}
  });
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
  while (processing < PARALLEL && (item = items.find((i) => i.status === "waiting"))) {
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
  const worker = idleWorkers.pop() || new Worker("/js/image-worker.js");
  const result = await new Promise((resolve) => {
    worker.onmessage = (event) => resolve(event.data);
    worker.onerror = () => resolve({ error: "Processing failed." });
    worker.postMessage({ id: item.id, file: item.file, watermark: currentWatermark() });
  });
  idleWorkers.push(worker);

  if (item.status === "removed") return; // the list was cleared meanwhile
  if (result.error) {
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
  while (uploading < PARALLEL && (item = items.find((i) => i.status === "ready"))) {
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
  const { thumb, display, width, height } = item.result;
  const form = new FormData();
  form.append("set_id", setId);
  form.append("width", width);
  form.append("height", height);
  form.append("alt_text", `Photo from ${set.title}`);
  form.append("thumb", thumb, `thumb.${extension(thumb)}`);
  form.append("display", display, `display.${extension(display)}`);

  try {
    const response = await fetch("/api/admin/photos", { method: "POST", body: form });
    if (response.status === 401) return (location.href = "/admin/login");
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Server said ${response.status}`);
    }
    item.status = "done";
  } catch (err) {
    item.status = "error";
    item.error = `Upload failed: ${err.message}`;
  }
  renderItem(item);
}

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
    const { thumb, display } = item.result;
    sizes.textContent = `${formatBytes(item.file.size)} → ${formatBytes(thumb.size)} + ${formatBytes(display.size)}`;
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
  if (errors) text += ` ${errors} could not be used (see below).`;
  $("queue-summary").textContent = text;

  // Each photo counts twice: once for shrinking, once for uploading.
  $("queue-progress").max = Math.max(1, (total - errors) * 2);
  $("queue-progress").value = processed - errors + done;

  $("upload-button").disabled = ready === 0 || count("waiting") + count("processing") > 0 || uploading > 0;
  $("upload-button").textContent = `Upload ${ready || ""} ${ready === 1 ? "photo" : "photos"}`.replace("  ", " ");

  // The watermark is baked in while shrinking, so it cannot change mid-batch.
  wmOn.disabled = wmText.disabled = isBusy() || ready > 0;
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
