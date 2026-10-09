// Admin dashboard: storage used, the list of sets, creating sets, and logging out.

async function loadStats() {
  const response = await fetch("/api/admin/stats");
  if (response.status === 401) {
    location.href = "/admin/login"; // session expired
    return;
  }
  const stats = await response.json();

  const percent = (stats.bytes_used / stats.bytes_limit) * 100;
  document.getElementById("storage-text").textContent =
    `${formatBytes(stats.bytes_used)} of ${formatBytes(stats.bytes_limit)} used (${percent.toFixed(1)}%)`;
  document.getElementById("storage-fill").style.width = `${Math.min(percent, 100)}%`;
  document.getElementById("counts").textContent =
    `${stats.set_count} sets, ${stats.photo_count} photos`;
}

function formatBytes(bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ---------- Sets ----------

const setList = document.getElementById("set-list");

async function loadSets() {
  const response = await fetch("/api/admin/sets");
  if (!response.ok) return;
  const sets = await response.json();
  setList.replaceChildren(...sets.map(createSetRow));
}

function createSetRow(set) {
  const item = document.createElement("li");
  const link = document.createElement("a");
  link.href = `/admin/set?id=${set.id}`;
  link.textContent = set.title;
  const count = document.createElement("span");
  count.className = "muted";
  count.textContent = `${set.photo_count} ${set.photo_count === 1 ? "photo" : "photos"}`;
  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "button-danger";
  remove.textContent = "Delete";
  remove.setAttribute("aria-label", `Delete set ${set.title}`);
  remove.addEventListener("click", () => deleteSet(set, item));
  item.append(link, count, remove);
  return item;
}

async function deleteSet(set, row) {
  const photos = `${set.photo_count} ${set.photo_count === 1 ? "photo" : "photos"}`;
  // confirm() shows the browser's own OK/Cancel box. Deleting cannot be undone,
  // so always ask first.
  if (!confirm(`Delete the set "${set.title}" and its ${photos}?\n\nThis cannot be undone.`)) return;

  const response = await fetch(`/api/admin/sets/${set.id}`, { method: "DELETE" });
  if (!response.ok) {
    alert("Could not delete the set. Please try again.");
    return;
  }
  row.remove();
  loadStats(); // storage went down
}

document.getElementById("new-set-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.getElementById("new-set-error");
  error.textContent = "";

  const response = await fetch("/api/admin/sets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: document.getElementById("new-set-title").value }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    error.textContent = data.error || "Could not create the set.";
    return;
  }
  // Go straight to the new set's upload page.
  location.href = `/admin/set?id=${data.id}`;
});

// ---------- Log out ----------

document.getElementById("logout").addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  location.href = "/admin/login";
});

loadSets().catch((error) => console.error(error));
loadStats().catch((error) => {
  console.error(error);
  document.getElementById("storage-text").textContent = "Could not load storage info.";
});
