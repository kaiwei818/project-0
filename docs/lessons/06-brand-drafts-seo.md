# Lesson 6: Branding, drafts, search engines, and the 404 page

The last touches before going live.

---

## Part A: The site name, in one place

Every page now shows **winstonlens** in the header and the browser tab, and
**© 2026 Winston Chang · winstonlens** at the bottom. These come from one file,
`lib/site.js`:

```js
export const SITE = {
  name: "winstonlens",
  owner: "Winston Chang",
  description: "Photography by Winston Chang.",
};
```

To change any of them later, edit this file and deploy. The year updates by itself.

### How it gets into every page

The HTML pages contain empty placeholders, like:

```html
<a class="site-name" href="/" data-site="name"></a>
<title data-page="Forest"></title>
```

`functions/_middleware.js` runs for **every** request to the site (a file called
`_middleware.js` at the top of `functions/` does that). When the response is an
HTML page, it fills the placeholders in as the page streams past:
`data-site="name"` gets "winstonlens", and `<title data-page="Forest">` becomes
`<title>Forest | winstonlens</title>`.

The same file now adds the security headers from Lesson 5 to every response, so
the separate `public/_headers` list is gone: one list, one place.

---

## Part B: Draft sets

**New sets start as drafts.** A draft is invisible to visitors: it is not on the
home page, its address shows "Page not found", and it is not in the sitemap.

On the set's admin page, the **Visibility** box shows the state:

- **Publish** makes the set public.
- **Unpublish (back to draft)** hides it again. Its photos stay; nothing is deleted.
- **Preview** opens the public page. While you are logged in, you can see drafts,
  with a yellow "Draft preview" bar at the top as a reminder.

The dashboard shows a yellow **Draft** label next to unpublished sets.

Sets that already existed before this change stay published, so nothing
disappeared from your site.

### How it works

`migrations/0003_drafts.sql` adds a `published` column to the `sets` table
(1 = public, 0 = draft). Every public query now includes `WHERE published = 1`.
The set page and its data check `isLoggedIn()` from Lesson 2 to let you, and only
you, see drafts.

**One honest limit:** the image files of a draft are not locked. Their addresses
contain a long random code that nobody can guess, so they stay private in
practice, but someone you sent a direct image link to could still open it.

---

## Part C: Search engines and link previews

- **`/robots.txt`** tells Google and others what to skip: `/admin` and `/api/`.
- **`/sitemap.xml`** lists your home page and every published set, built fresh
  from the database each time, so new sets appear automatically.
- **Link previews** (iMessage, LINE, Facebook, X) now get the title, description,
  page address, and a preview picture. The picture is the 1200 px thumbnail
  instead of the 3000 px version, since some apps give up on large images.
  The home page uses the cover of your first set.

After going live, you can tell Google about your site at
https://search.google.com/search-console: add your site, then submit
`https://<your-address>/sitemap.xml`. It is free, and it also shows what people
search for to find you.

---

## Part D: The "page not found" page

`public/404.html` is shown for any address that does not exist, and for drafts.
It shows your header and footer, says the page was not found, and has a button
back to your sets. Cloudflare uses a file with exactly this name automatically.
The server also sends the status code **404**, so search engines know to forget
old addresses.

---

## Try it on your Mac

```
cd ~/project-0
git pull
npm run db:migrate:local
npm run dev
```

`db:migrate:local` adds the new `published` column to your local database. When
you deploy, run `npm run db:migrate:remote` too (the README steps already
include it).

Then:

1. Open http://localhost:8788: the header says **winstonlens**, the footer has
   your name.
2. In `/admin`, create a set. It shows **Draft**. Open
   http://localhost:8788 in a private window (Cmd + Shift + N in Safari or Chrome):
   the draft is not there.
3. Click **Publish**, then refresh the private window. Now it is.
4. Open http://localhost:8788/anything-wrong to see the 404 page.
5. Open http://localhost:8788/robots.txt and http://localhost:8788/sitemap.xml.

---

## Part E: Two fixes from testing

### Set descriptions

The description now also shows on the set's card on the home page (up to two
lines), and under the title on the set page, keeping the line breaks you typed.
Like captions, set details now save by themselves when you click outside a box;
the **Save details** button still works too.

### Some photos in a batch failing

**What happened:** of the photos you selected, only some uploaded.

**Why:** shrinking a 25 MB photo briefly needs about 100 MB of memory for its
pixels. Safari limits how much memory images may use, and it frees that memory
slowly. After a few photos it ran out, and the next ones failed (each failed card
showed a red message, easy to miss in a long list).

**The fixes** (`public/js/image-worker.js` and `public/js/admin-set.js`):

1. Memory is freed the moment each step is done: the canvas is shrunk to 0 x 0
   pixels, which makes the browser let go of it at once.
2. Safari cannot make WebP files. Before, every photo was first saved as a large
   PNG by mistake and then redone as JPEG. Now the page checks once and goes
   straight to JPEG.
3. If a photo fails, it is tried again automatically, and from then on photos are
   shrunk one at a time (slower, but much lighter on memory). The background
   thread that failed is thrown away and replaced by a fresh one.
4. A failed upload (for example, Wi-Fi dropping for a moment) is also retried once
   by itself.
5. If something still fails, the summary turns red with the number of failures,
   and a **Retry failed** button appears.

A photo that is damaged, or not a JPEG, PNG, or WebP (for example a RAW `.ARW`
or `.CR3` file, or an iPhone `.HEIC`), cannot be fixed by retrying; its card says
why.
