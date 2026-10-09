// GET /about
// Serves public/about.html with your bio, portrait, and contact details filled
// in on the server. Search engines and link previews read the finished page, and
// visitors see everything at once, with no loading step.

import { withPageMeta } from "../lib/meta.js";
import { ABOUT_KEYS, getSettings } from "../lib/settings.js";

export async function onRequestGet({ request, env }) {
  const about = await getSettings(env, ABOUT_KEYS);
  const url = new URL(request.url);
  const page = await env.ASSETS.fetch(new URL("/about.html", url));

  // Everything you typed is "escaped" before it goes into the page, so a "<" in
  // your bio shows as a "<" and can never become HTML or a script.
  const bioHtml = about.about_bio
    ? about.about_bio.split(/\n\s*\n/).map((paragraph) =>
        `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, "<br>")}</p>`).join("")
    : `<p class="muted">More about me is coming soon.</p>`;

  const contact = [];
  if (about.about_email) {
    contact.push(link(`mailto:${about.about_email}`, "Email", about.about_email));
  }
  if (about.about_instagram) {
    contact.push(link(`https://www.instagram.com/${about.about_instagram}/`, "Instagram", `@${about.about_instagram}`));
  }
  if (about.about_link_url) {
    const shown = about.about_link_url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    contact.push(link(about.about_link_url, about.about_link_label || "Website", shown));
  }

  const portrait = about.about_portrait_key ? portraitHtml(about) : "";

  const filled = new HTMLRewriter()
    .on("#about-bio", { element(el) { el.setInnerContent(bioHtml, { html: true }); } })
    .on("#about-contact", { element(el) { el.setInnerContent(contact.join(""), { html: true }); } })
    .on("#contact-heading", { element(el) { if (!contact.length) el.remove(); } })
    .on("#about-portrait", {
      element(el) {
        if (portrait) el.setInnerContent(portrait, { html: true });
        else el.remove();
      },
    })
    .transform(page);

  const firstParagraph = about.about_bio.split(/\n\s*\n/)[0].replace(/\s+/g, " ").trim();
  return withPageMeta(filled, {
    title: "About",
    description: firstParagraph.length > 160 ? `${firstParagraph.slice(0, 157)}...` : firstParagraph,
    url: url.origin + "/about",
    image: about.about_portrait_key ? `${url.origin}/img/${about.about_portrait_key}` : "",
  });
}

function link(href, label, shown) {
  // Links to other sites open in a new tab; "noopener" stops that tab from
  // being able to control this one.
  const external = href.startsWith("http") ? ' target="_blank" rel="noopener"' : "";
  return `<li><span class="contact-label">${escapeHtml(label)}</span>` +
    `<a href="${escapeHtml(href)}"${external}>${escapeHtml(shown)}</a></li>`;
}

function portraitHtml(about) {
  const width = Number(about.about_portrait_width) || 0;
  const height = Number(about.about_portrait_height) || 0;
  const widthAt = (edge) => (width >= height ? edge : Math.round((edge * width) / height));
  const srcset = about.about_portrait_small_key
    ? `/img/${about.about_portrait_small_key} ${widthAt(800)}w, /img/${about.about_portrait_key} ${widthAt(1200)}w`
    : "";
  return `<img src="/img/${escapeHtml(about.about_portrait_key)}"` +
    (srcset ? ` srcset="${escapeHtml(srcset)}" sizes="(max-width: 700px) calc(100vw - 32px), 420px"` : "") +
    ` width="${width}" height="${height}" alt="Portrait of the photographer">`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
