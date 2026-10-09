// Admin dashboard: shows storage used and handles logging out.

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

document.getElementById("logout").addEventListener("click", async () => {
  await fetch("/api/admin/logout", { method: "POST" });
  location.href = "/admin/login";
});

loadStats().catch((error) => {
  console.error(error);
  document.getElementById("storage-text").textContent = "Could not load storage info.";
});
