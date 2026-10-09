// Admin page for license codes: create codes, see how much they were used,
// switch them off (and on again), or delete them.

const $ = (id) => document.getElementById(id);

async function getJson(url) {
  const response = await fetch(url);
  if (response.status === 401) location.href = "/admin/login";
  return response.json();
}

async function loadSets() {
  const sets = await getJson("/api/admin/sets");
  $("set-boxes").replaceChildren(...sets.map((set) => {
    const label = document.createElement("label");
    label.className = "checkbox";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.value = set.id;
    label.append(box, ` ${set.title}${set.published ? "" : " (draft)"}`);
    return label;
  }));
}

async function loadCodes() {
  const codes = await getJson("/api/admin/licenses");
  $("codes-empty").hidden = codes.length > 0;
  $("codes-table").hidden = codes.length === 0;
  $("codes-body").replaceChildren(...codes.map(codeRow));
}

function codeRow(code) {
  const row = document.createElement("tr");
  const now = Date.now() / 1000;
  const expired = code.expires_at && code.expires_at < now;
  const usedUp = code.max_downloads !== null && code.downloads >= code.max_downloads;
  if (code.revoked || expired || usedUp) row.className = "is-off";

  const cell = (text, className = "") => {
    const td = document.createElement("td");
    td.textContent = text;
    if (className) td.className = className;
    return td;
  };

  const codeCell = document.createElement("td");
  const codeText = document.createElement("code");
  codeText.textContent = code.code;
  codeCell.append(codeText);
  const state = code.revoked ? "Switched off" : expired ? "Expired" : usedUp ? "No downloads left" : "";
  if (state) codeCell.append(document.createElement("br"), state);

  const used = code.max_downloads === null ? `${code.downloads}` : `${code.downloads} / ${code.max_downloads}`;
  const until = code.expires_at ? new Date(code.expires_at * 1000).toISOString().slice(0, 10) : "No end";

  const actions = document.createElement("td");
  actions.className = "license-actions";
  const copy = button("Copy", async () => {
    await navigator.clipboard.writeText(code.code).catch(() => {});
    copy.textContent = "Copied";
    setTimeout(() => (copy.textContent = "Copy"), 1500);
  });
  const toggle = button(code.revoked ? "Switch on" : "Switch off", async () => {
    await fetch(`/api/admin/licenses/${code.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revoked: !code.revoked }),
    });
    loadCodes();
  });
  const remove = button("Delete", async () => {
    if (!confirm(`Delete the code ${code.code}? It stops working immediately.`)) return;
    await fetch(`/api/admin/licenses/${code.id}`, { method: "DELETE" });
    loadCodes();
  }, "button-danger");
  actions.append(copy, toggle, remove);

  row.append(
    codeCell,
    cell(code.label || "-"),
    cell(code.sets.map((s) => s.title).join(", ") || "(sets deleted)", "hide-small"),
    cell(used),
    cell(until, "hide-small"),
    actions,
  );
  return row;
}

function button(text, onClick, className = "button-secondary") {
  const b = document.createElement("button");
  b.type = "button";
  b.className = className;
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

$("new-code-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = $("new-code-error");
  error.textContent = "";
  $("new-code-result").hidden = true;
  const setIds = [...$("set-boxes").querySelectorAll("input:checked")].map((b) => Number(b.value));
  const response = await fetch("/api/admin/licenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      label: $("code-label").value,
      set_ids: setIds,
      expires_on: $("code-expires").value,
      max_downloads: $("code-max").value || null,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    error.textContent = data.error || "Could not create the code.";
    return;
  }
  const result = $("new-code-result");
  result.replaceChildren("New code: ", Object.assign(document.createElement("code"), { textContent: data.code }),
    ". Send it to the person, with a link to the set.");
  result.hidden = false;
  event.target.reset();
  loadCodes();
});

Promise.all([loadSets(), loadCodes()]).catch((error) => console.error(error));
