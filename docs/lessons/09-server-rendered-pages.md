# Lesson 9: Fixing "Soft 404": pages that arrive complete

## What Google said

When you asked Google to index your home page, Search Console answered:

> Page cannot be indexed: **Soft 404**

A "real" 404 is a page that says "not found" with the status code 404. A
**soft** 404 is a page that answers "OK" (200) but **looks** empty or broken, so
Google treats it as not found anyway.

## Why it happened

There are two ways to build a web page:

| | Built in the browser (before) | Built on the server (now) |
|---|---|---|
| What the server sends | An empty list and the word "Loading..." | The finished page with your sets and photos |
| Then | The browser runs JavaScript, asks `/api/sets`, builds the cards | Nothing more needed |
| What Google sees first | "Loading..." | Your content |

Google can run JavaScript, but it judges pages largely by the first version it
receives, and that version of your home page was nearly empty. So it decided
there was nothing to index.

## The fix

The server now builds the content into the page before sending it:

- **`functions/index.js`** asks the database for your published sets and puts
  one card per set into the home page (title, description, photo count, cover).
- **`functions/sets/[slug].js`** puts the set's title, description, and every
  photo into the set page. The photo details the viewer needs travel along in the
  page as data (`<script type="application/json">`), so the viewer opens without
  another request.
- **`lib/render.js`** builds the HTML for a card and for a photo. Every piece of
  text is escaped first, so a title like `<b>bold</b>` shows as those characters
  and never turns into HTML.
- **`lib/queries.js`** holds the database questions, shared by the pages and the
  `/api/...` data addresses, so they always agree.
- `public/js/home.js` is gone: nothing is left for the browser to build.
  `public/js/set.js` only connects the viewer to the photos already on the page.

Two smaller improvements came along:

- The home page shows your tagline, "Photography by Winston Chang." (from
  `lib/site.js`), which also gives Google some text to read.
- Every page now names its own main address (a **canonical** link), so Google
  does not mistake slightly different addresses for duplicate pages.

The security rules now allow inline `style="..."` attributes, because each photo
in the grid gets its shape that way before any script runs. Scripts are still
strictly limited to files from your own site.

**Bonus for visitors:** pages appear faster, because there is no "Loading..."
step and no extra request before the photos start downloading.

## Test it like Google

With `npm run dev` running, look at exactly what the server sends:

```
curl -s http://localhost:8788/ | grep "<h2>"
```

You see one line per set. Before this change, there were none.

## After you deploy

1. In Search Console, open **URL inspection**, enter `https://winstonlens.pages.dev/`,
   click **Test live URL**, and check **Page availability** says the page can be indexed.
2. Click **Request indexing**.
3. Do the same for one of your set pages.

Also make sure at least one set is **published** and has photos: a site with only
drafts really is empty to visitors and to Google.
