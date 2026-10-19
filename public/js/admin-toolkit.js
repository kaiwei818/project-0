// The watermark toolkit (admin/toolkit.html): adds your watermark to original
// photos at full size, for you to save and use anywhere (social media, clients,
// print previews).
//
// Nothing is uploaded: the photos are read, watermarked (in toolkit-worker.js),
// and saved, all inside this browser. The results only live in this tab until
// you download them or close the page.

import { makeZip } from "./zip.js";

const $ = (id) => document.getElementById(id);
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

let items = [];   // { id, file, status, result, el }
let nextId = 1;
let worker = null;
let busy = false;

// ---------- Settings (remembered in this browser) ----------

const radios = (name) => [...document.querySelectorAll(`input[name="${name}"]`)];
const picked = (name) => radios(name).find((r) => r.checked)?.value;

function loadSettings() {
  try {
    // The same text as the upload page, so you only type it once.
    $("tk-text").value = localStorage.getItem("watermark-text") ?? "";
    const saved = JSON.parse(localStorage.getItem("toolkit-settings") || "{}");
    for (const r of radios("tk-style")) r.checked = r.value === (saved.style || "full");
    for (const r of radios("tk-strength")) r.checked = r.value === (saved.strength || "strong");
    if (saved.size !== undefined) $("tk-size").value = saved.size;
    if (saved.quality !== undefined) $("tk-quality").value = saved.quality;
  } catch {
    // Storage blocked (private browsing): the defaults still work.
  }
  showStrength();
}

function saveSettings() {
  try {
    localStorage.setItem("watermark-text", $("tk-text").value);
    localStorage.setItem("toolkit-settings", JSON.stringify({
      style: picked("tk-style"),
      strength: picked("tk-strength"),
      size: $("tk-size").value,
      quality: $("tk-quality").value,
    }));
  } catch {}
}

function settings() {
  return {
    text: $("tk-text").value.trim(),
    style: picked("tk-style"),
    strength: picked("tk-strength"),
    maxEdge: Number($("tk-size").value),
    quality: Number($("tk-quality").value),
  };
}

// Strength only applies to the full style.
function showStrength() {
  $("tk-strength-field").hidden = picked("tk-style") !== "full";
}

for (const input of [$("tk-text"), $("tk-size"), $("tk-quality"), ...radios("tk-style"), ...radios("tk-strength")]) {
  input.addEventListener("change", () => {
    saveSettings();
    showStrength();
  });
}

// ---------- Adding files ----------

$("tk-files").addEventListener("change", (event) => {
  addFiles(event.target.files);
  event.target.value = "";
});

const drop = $("tk-drop");
drop.addEventListener("dragover", (event) => {
  event.preventDefault();
  drop.classList.add("dragging");
});
drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
drop.addEventListener("drop", (event) => {
  event.preventDefault();
  drop.classList.remove("dragging");
  addFiles(event.dataTransfer.files);
});
// A file dropped anywhere else would make the browser open it and leave this page.
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => event.preventDefault());

function addFiles(fileList) {
  if (!settings().text) {
    alert("Type your watermark text first.");
    $("tk-text").focus();
    return;
  }
  for (const file of fileList) {
    const item = { id: nextId++, file, status: "waiting", el: createCard(file) };
    if (!ALLOWED_TYPES.includes(file.type)) {
      item.status = "error";
      item.error = "Not a JPEG, PNG, or WebP file.";
    }
    items.push(item);
    $("tk-list").append(item.el.root);
    render(item);
  }
  $("tk-results").hidden = items.length === 0;
  pump();
}

function createCard(file) {
  const root = document.createElement("li");
  const img = document.createElement("img");
  img.alt = "";
  const text = document.createElement("div");
  const name = document.createElement("p");
  name.className = "queue-name";
  name.textContent = file.name;
  const info = document.createElement("p");
  info.className = "muted";
  const status = document.createElement("p");
  status.className = "queue-status";
  const link = document.createElement("a");
  link.className = "button-link";
  link.hidden = true;
  link.textContent = "Download";
  text.append(name, info, status, link);
  root.append(img, text);
  return { root, img, info, status, link };
}

// ---------- Processing, one photo at a time ----------
// Full-size photos take a lot of memory (a 24 megapixel photo is about 100 MB
// while it is being edited), so only one is worked on at once.

async function pump() {
  if (busy) return;
  busy = true;
  let item;
  while ((item = items.find((i) => i.status === "waiting"))) {
    item.status = "processing";
    render(item);
    const result = await processOne(item);
    if (item.status === "removed") continue; // the list was cleared meanwhile
    if (result.error) {
      item.status = "error";
      item.error = result.error;
    } else {
      item.status = "ready";
      forget(item);
      item.result = { ...result, url: URL.createObjectURL(result.blob), previewUrl: URL.createObjectURL(result.preview) };
    }
    render(item);
    summary();
  }
  busy = false;
  summary();
}

function processOne(item) {
  worker ||= new Worker("/js/toolkit-worker.js", { type: "module" });
  return new Promise((resolve) => {
    worker.onmessage = (event) => resolve(event.data);
    worker.onerror = () => {
      worker.terminate(); // start the next photo with a fresh worker and all its memory free
      worker = null;
      resolve({ error: "Processing failed." });
    };
    worker.postMessage({ id: item.id, file: item.file, ...settings() });
  }).then((result) => {
    if (result.error && worker) {
      worker.terminate();
      worker = null;
    }
    return result;
  });
}

// Lets the browser free a result's memory.
function forget(item) {
  if (item.result) {
    URL.revokeObjectURL(item.result.url);
    URL.revokeObjectURL(item.result.previewUrl);
    item.result = null;
  }
}

// "photo.CR3.jpeg" -> "photo-watermarked.jpg"
function outputName(file) {
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return `${base}-watermarked.jpg`;
}

// ---------- Showing the list ----------

const STATUS = { waiting: "Waiting", processing: "Adding watermark...", ready: "Ready" };

function render(item) {
  const { root, img, info, status, link } = item.el;
  root.dataset.status = item.status === "ready" ? "done" : item.status;
  status.textContent = item.status === "error" ? item.error : STATUS[item.status];
  if (item.result) {
    img.src = item.result.previewUrl;
    info.textContent = `${item.result.width} × ${item.result.height} px · ${formatBytes(item.file.size)} → ${formatBytes(item.result.blob.size)}`;
    link.href = item.result.url;
    link.download = outputName(item.file);
    link.hidden = false;
  } else {
    img.removeAttribute("src");
    info.textContent = formatBytes(item.file.size);
    link.hidden = true;
  }
}

function summary() {
  const ready = items.filter((i) => i.status === "ready");
  const left = items.filter((i) => i.status === "waiting" || i.status === "processing").length;
  const errors = items.filter((i) => i.status === "error").length;
  const total = ready.reduce((sum, i) => sum + i.result.blob.size, 0);
  let text = left
    ? `Working: ${ready.length} of ${ready.length + left} done.`
    : `${ready.length} ${ready.length === 1 ? "photo" : "photos"} ready (${formatBytes(total)}).`;
  if (errors) text += ` ${errors} failed: see the red messages below.`;
  $("tk-summary").textContent = text;
  $("tk-progress").max = Math.max(1, ready.length + left);
  $("tk-progress").value = ready.length;
  $("tk-zip").disabled = left > 0 || ready.length === 0;
  $("tk-redo").disabled = left > 0;
}

// ---------- Buttons ----------

$("tk-zip").addEventListener("click", async () => {
  const button = $("tk-zip");
  button.disabled = true;
  button.textContent = "Making the .zip...";
  try {
    // Two photos with the same name get " (2)", " (3)" so neither is lost.
    const used = new Map();
    const files = items.filter((i) => i.status === "ready").map((item) => {
      let name = outputName(item.file);
      const count = (used.get(name) || 0) + 1;
      used.set(name, count);
      if (count > 1) name = name.replace(/\.jpg$/, ` (${count}).jpg`);
      return { name, blob: item.result.blob };
    });
    const zip = await makeZip(files);
    const link = document.createElement("a");
    link.href = URL.createObjectURL(zip);
    link.download = `watermarked-${new Date().toISOString().slice(0, 10)}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
  } catch (err) {
    alert(`Could not make the .zip: ${err.message}`);
  } finally {
    button.textContent = "Download all (.zip)";
    summary();
  }
});

$("tk-redo").addEventListener("click", () => {
  if (!settings().text) return alert("Type your watermark text first.");
  for (const item of items) {
    if (item.status === "ready" || (item.status === "error" && ALLOWED_TYPES.includes(item.file.type))) {
      forget(item);
      item.status = "waiting";
      render(item);
    }
  }
  pump();
});

$("tk-clear").addEventListener("click", () => {
  for (const item of items) {
    forget(item);
    item.status = "removed";
  }
  items = [];
  $("tk-list").replaceChildren();
  $("tk-results").hidden = true;
});

// Leaving the page throws the results away; warn first if some are not saved.
window.addEventListener("beforeunload", (event) => {
  if (items.some((i) => i.status === "ready" || i.status === "processing" || i.status === "waiting")) {
    event.preventDefault();
  }
});

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

loadSettings();
