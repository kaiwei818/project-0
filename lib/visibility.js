// When is a set public? When it is published, or when its scheduled time
// (publish_at) has passed. Every public page uses the same rule, from here.
//
import { logActivity, quoted } from "./activity.js";

// The check happens in the database query itself, at the moment someone asks,
// so a scheduled set appears exactly on time without any timer running.

export const NOW_SQL = `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`;

// SQL for "this set is public". alias: the table's short name in the query.
export function isPublicSql(alias = "s") {
  return `(${alias}.published = 1 OR (${alias}.publish_at != '' AND ${alias}.publish_at <= ${NOW_SQL}))`;
}

// Turns sets whose scheduled time has passed into normal published sets, and
// logs it. Called when you open the admin pages, so they show the real state.
// (Visitors never need this: isPublicSql already counts them as public.)
export async function settleScheduled(context) {
  const { env } = context;
  // Read first: after the update, the scheduled time is gone.
  const { results } = await env.DB.prepare(
    `SELECT id, title, publish_at FROM sets
     WHERE published = 0 AND publish_at != '' AND publish_at <= ${NOW_SQL}`
  ).all();
  for (const set of results) {
    const done = await env.DB.prepare(
      `UPDATE sets SET published = 1, publish_at = '' WHERE id = ? AND publish_at = ?`
    ).bind(set.id, set.publish_at).run();
    if (done.meta.changes) {
      await logActivity(context, "publish", `${quoted(set.title)} went public as scheduled (${set.publish_at})`, set.id);
    }
  }
}
