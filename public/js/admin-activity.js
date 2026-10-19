// The activity log page (admin/activity.html). Reads /api/admin/activity, 100
// lines at a time, and shows them as a table. The filter buttons show one kind.

const $ = (id) => document.getElementById(id);
let group = "";
let lastId = null; // the oldest line shown, for "Load more"

async function load(more = false) {
  const params = new URLSearchParams();
  if (group) params.set("group", group);
  if (more && lastId) params.set("before", lastId);
  $("status").textContent = "Loading...";
  $("status").hidden = false;

  const response = await fetch(`/api/admin/activity?${params}`);
  if (response.status === 401) return (location.href = "/admin/login");
  if (!response.ok) {
    $("status").textContent = "Could not load the activity log.";
    return;
  }
  const { lines, more: hasMore } = await response.json();
  if (!more) $("lines").replaceChildren();
  $("lines").append(...lines.map(row));
  lastId = lines.length ? lines[lines.length - 1].id : lastId;

  $("more").hidden = !hasMore;
  $("status").hidden = $("lines").children.length > 0;
  $("status").textContent = "Nothing here yet.";
}

function row(line) {
  const tr = document.createElement("tr");
  const when = document.createElement("td");
  const date = new Date(line.at);
  when.textContent = date.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  when.title = line.at; // the exact time in UTC
  const what = document.createElement("td");
  const badge = document.createElement("span");
  badge.className = "activity-group";
  badge.dataset.group = line.group;
  badge.textContent = line.action.replace(/_/g, " ");
  what.append(badge);
  const details = document.createElement("td");
  details.textContent = line.summary; // text, never HTML
  if (line.set_id && line.action !== "set_delete") {
    details.append(" ");
    const link = document.createElement("a");
    link.href = `/admin/set?id=${line.set_id}`;
    link.textContent = "Open set";
    link.className = "muted";
    details.append(link);
  }
  const from = document.createElement("td");
  from.className = "muted";
  from.textContent = line.country || "";
  tr.append(when, what, details, from);
  return tr;
}

for (const button of $("filters").querySelectorAll("button")) {
  button.addEventListener("click", () => {
    group = button.dataset.group;
    for (const other of $("filters").querySelectorAll("button")) {
      other.setAttribute("aria-pressed", String(other === button));
    }
    lastId = null;
    load();
  });
}
$("more").addEventListener("click", () => load(true));

load();
