// Download receipts: a record of every clean file downloaded with a license
// code: which set, which photo, which code, where from (region only, from
// Cloudflare; never the IP address), and when. See /admin/receipts.
//
// Optional email: if you store two secrets, you also get an email.
//   RESEND_API_KEY  an API key from resend.com (free plan: 3,000 emails a month)
//   RECEIPT_EMAIL   the address to send to (your Resend account's email)
// So a "Download all" of 60 photos does not send 60 emails, you get at most
// one email per code per hour; the full list is always on the receipts page.

const EMAIL_EVERY_SECONDS = 60 * 60;

// "Taipei, Taipei City, TW" (whatever parts Cloudflare knows).
export function placeOf(request) {
  const cf = request.cf || {};
  return [cf.city, cf.region, cf.country].filter(Boolean).join(", ");
}

export async function recordReceipt(context, { license, photo, viaAll }) {
  const { env, request } = context;
  const cf = request.cf || {};
  try {
    // Was an email for this code sent within the last hour? (Checked before
    // adding this receipt.)
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM download_receipts WHERE code_id = ? AND at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', ?)`
    ).bind(license.id, `-${EMAIL_EVERY_SECONDS} seconds`).first();

    await env.DB.prepare(
      `INSERT INTO download_receipts (code_id, code, code_label, set_id, set_title, photo_id, photo_name,
                                      country, region, city, via_all)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(license.id, license.code, license.label || "", photo.set_id, photo.title, photo.id,
           photo.original_name || "", cf.country || "", cf.region || "", cf.city || "", viaAll ? 1 : 0).run();

    if (recent.n === 0 && env.RESEND_API_KEY && env.RECEIPT_EMAIL) {
      // Sent in the background (waitUntil), so the download does not wait for it.
      context.waitUntil?.(sendEmail(env, request, { license, photo, viaAll }));
    }
  } catch (err) {
    console.error("Could not save the download receipt:", err); // never block the download
  }
}

async function sendEmail(env, request, { license, photo, viaAll }) {
  const origin = new URL(request.url).origin;
  const who = license.label ? `${license.code} (${license.label})` : license.code;
  const lines = [
    `A clean photo was downloaded from your site.`,
    ``,
    `Code:   ${who}`,
    `Set:    ${photo.title}`,
    `Photo:  #${photo.id}${photo.original_name ? ` (${photo.original_name})` : ""}${viaAll ? ", as part of Download all" : ""}`,
    `Where:  ${placeOf(request) || "unknown"}`,
    `When:   ${new Date().toISOString().replace("T", " ").slice(0, 19)} UTC`,
    ``,
    `More downloads with this code in the next hour will not send another email.`,
    `All receipts: ${origin}/admin/receipts`,
  ];
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.RECEIPT_FROM || "Photo downloads <onboarding@resend.dev>",
        to: [env.RECEIPT_EMAIL],
        subject: `Download: ${photo.title} (${who})`,
        text: lines.join("\n"),
      }),
    });
    if (!response.ok) console.error("Receipt email failed:", response.status, await response.text());
  } catch (err) {
    console.error("Receipt email failed:", err);
  }
}
