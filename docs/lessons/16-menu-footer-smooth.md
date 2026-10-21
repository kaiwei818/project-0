# Lesson 16: The menu, contact on every page, and smooth page changes

## The ☰ menu (top right, every page)

The header now has your name on the left and one **Menu** button on the right,
on computers and phones alike. It stays at the top while you scroll, so the
menu is always one tap away.

The menu slides in from the right and has:

- **Work**, **About**, and **Contact** (Contact jumps to the end of the page)
- **Sets**: every public set, so visitors can go straight to any of them
- **Categories**, when you have them
- **Share this page**, and the **light / dark** switch (both moved here from the header)

The page you are on is underlined. Close the menu with ×, the Escape key, or
by tapping the dark area beside it.

How it is built:

- `lib/chrome.js` builds the menu on the server, for every page, from the
  database (so a new set appears in the menu by itself). `functions/_middleware.js`
  puts it into each public page.
- `public/js/menu.js` opens and closes it. It is a `<dialog>`, which keeps
  keyboard focus inside while open and works with screen readers.

## Contact at the end of every page

Every public page now ends with **Get in touch**: your email, Instagram, and
link, the same ones as on the About page. Change them in the admin area,
**About page**, and every page updates. If you leave them all empty, only
the © line shows.

## Smooth page changes

Before, going from page to page meant a white flash while the next page loaded.
Now, in Chrome, Edge, and Safari 18 or newer:

- **Pages fade into each other**, and the header stays still (the View
  Transitions feature of the browser; the CSS is under "Smooth page changes"
  in `style.css`).
- **Pages load before you click.** In Chrome and Edge, pointing at a link (or
  touching it) starts loading that page in the background, so it appears
  instantly. The rules are in `public/speculation-rules.json`; admin pages,
  data addresses, and images are left out.
- The menu slides, the photo viewer fades in and out, and "Contact" and
  "Back to top" glide instead of jumping.
- Photos show a soft color while they load, instead of a white gap.

Older browsers simply change pages the way they did before. Visitors who
turned on "Reduce motion" on their device get no fading or sliding.
