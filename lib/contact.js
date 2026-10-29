// Your contact details, as you entered them on the admin About page.
// Used by the About page and by the "Get in touch" part at the end of every
// page (lib/chrome.js), so you only keep them up to date in one place.

export const CONTACT_KEYS = ["about_email", "about_phone", "about_instagram", "about_link_label", "about_link_url"];

// Returns [{ label, href, shown }] for whatever is filled in.
export function contactItems(about) {
  const items = [];
  if (about.about_email) {
    items.push({ label: "Email", href: `mailto:${about.about_email}`, shown: about.about_email });
  }
  if (about.about_phone) {
    // tel: links keep only the digits and a leading +, so "+886 912-345-678"
    // dials +886912345678 when tapped on a phone.
    const dial = about.about_phone.replace(/(?!^\+)[^\d]/g, "");
    items.push({ label: "Phone", href: `tel:${dial}`, shown: about.about_phone });
  }
  if (about.about_instagram) {
    items.push({ label: "Instagram", href: `https://www.instagram.com/${about.about_instagram}/`, shown: `@${about.about_instagram}` });
  }
  if (about.about_link_url) {
    const shown = about.about_link_url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    items.push({ label: about.about_link_label || "Website", href: about.about_link_url, shown });
  }
  return items;
}

// Links to other sites open in a new tab; "noopener" stops that tab from
// being able to control this one.
export function externalAttrs(href) {
  return href.startsWith("http") ? ' target="_blank" rel="noopener"' : "";
}
