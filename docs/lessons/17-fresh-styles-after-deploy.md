# Lesson 17: Fresh styles after every deploy (the Safari problem)

## What went wrong

After lesson 16 went live, Chrome showed the new menu and footer, but Safari
showed them unstyled: a black "Menu" button, the menu as a plain box in the
middle of the page, and the contact details as a bullet list.

The page itself was new, but the style file (`/css/style.css`) was an old
copy that Safari had saved earlier. The old file has no rules for the menu or
footer, so they appeared bare.

Why it was saved: Cloudflare has a setting called **Browser Cache TTL**,
4 hours by default. It tells browsers "you may reuse this file for 4 hours
without asking again", even though Pages itself says "always check". So for
up to 4 hours after a deploy, any browser (yours or a visitor's) could mix
the new pages with the old styles and scripts. Chrome just happened to fetch
a fresh copy.

## The fix: a new address whenever a file changes

`npm run deploy` (now `scripts/deploy.mjs`) first makes a **fingerprint** of
all CSS and JS files: a short code like `3fbf8b8b5688` that changes whenever
any of those files change. Then every page asks for

```
/v/3fbf8b8b5688/css/style.css     instead of     /css/style.css
```

(`functions/_middleware.js` rewrites the addresses as each page is sent.)

- After you change a file, the fingerprint changes, so the address is new,
  and no browser can have an old copy of it. Everyone gets the update at once.
- When nothing changed, browsers keep the file for up to a year and do not
  ask again, so pages also load a little faster.
- Scripts that load other scripts (the photo viewer, the upload helpers) use
  addresses in the same `/v/<fingerprint>/` folder, so they stay in step.

## What you do differently

Nothing: keep using

```
npm run deploy
```

Do not run `npx wrangler pages deploy` by itself. It still works, but it
skips the fingerprint, so you are back to the 4 hour problem for that deploy.

## If a browser still shows something old

Only the page itself can now be old (for example a tab left open). Reload it.
In Safari, Option + Command + R reloads and ignores saved copies.

## Smooth page changes in Safari

The fade between pages needs Safari 18.2 or newer (macOS and iOS 18.2,
from December 2024). "Load the next page before you click" is a Chrome and
Edge feature; Safari changes pages normally, just without the head start.
