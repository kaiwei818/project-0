// GET /api/admin/activity?group=Download&before=123
// The activity log, newest first, 100 lines at a time.
//   group   optional: only one kind ("Upload", "Deletion", "License", "Download",
//           "Publishing", "Set", "Login"; see ACTIONS in lib/activity.js)
//   before  optional: the id of the last line you already have ("Load more")

import { ACTIONS } from "../../../../lib/activity.js";

const PAGE = 100;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const before = Number(url.searchParams.get("before")) || Number.MAX_SAFE_INTEGER;
  const group = url.searchParams.get("group") || "";
  const actions = Object.keys(ACTIONS).filter((a) => !group || ACTIONS[a] === group);
  if (actions.length === 0) return Response.json({ error: "Unknown group." }, { status: 400 });

  const { results } = await env.DB.prepare(
    `SELECT id, at, action, summary, set_id, country FROM activity_log
     WHERE id < ? AND action IN (${actions.map(() => "?").join(",")})
     ORDER BY id DESC LIMIT ?`
  ).bind(before, ...actions, PAGE + 1).all();

  const lines = results.slice(0, PAGE).map((line) => ({ ...line, group: ACTIONS[line.action] || "" }));
  return Response.json({ lines, more: results.length > PAGE });
}
