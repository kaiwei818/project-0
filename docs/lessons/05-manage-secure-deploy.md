# Lesson 5: Managing photos, security, and going live

This lesson finishes the spec: managing sets and photos (step 6), security
hardening (step 8), and putting the site on the internet (step 9).

---

## Part A: Managing sets and photos

### On the dashboard (`/admin`)

- **Storage:** the bar shows how much of the free 10 GB you use. Click **See
  storage by set** to open a list of every set, largest first, with its size,
  photo count, and its share of the space used so far.
- **Reorder sets:** drag the ⠿ handle, or use ↑ ↓. The order here is the order on
  the home page.
- **Delete** a set (asks first).

### On a set's page

- **Set details:** change the title, the web address, and the description that
  shows under the title on the public page. Click **Save details**.
- **Each photo has a card:**

| Control | What it does |
|---|---|
| Drag the picture (mouse) or the ⠿ grip (finger) | Move it anywhere in the set |
| ← → | Move it one place earlier or later |
| ☆ / ★ | Make it the cover on the home page (★ = current cover) |
| × | Delete it |
| Caption | Text shown under the photo in the full-screen viewer |
| Description (alt text) | Read aloud to blind visitors by their screen reader, and used by Google image search. Describe what is in the photo: "Wet street reflecting pink and blue neon signs". |

Captions and descriptions save by themselves when you click outside the box; a
green **Saved** confirms it.

### How reordering works

The browser sends the complete new order, for example `[30, 28, 27, 29]`. The
server checks it has exactly the photos of that set (none missing, none extra),
then numbers them 0, 1, 2, 3 in one go (`lib/order.js`). If the list does not
match, for example because you deleted a photo in another tab, it refuses and the
page reloads, instead of saving a broken order.

### How dragging works

The browser has built-in drag and drop, but it does not work with fingers on a
phone or tablet, and on a Mac it only shows a faint picture of what you drag. So
`public/js/sortable.js` does its own dragging with **pointer events**, which treat
a mouse, a trackpad, a pen, and a finger the same way:

1. Press and move a few pixels. (A plain click still works as a click.)
2. A floating copy follows your pointer; a dashed slot shows where it will land.
3. Hover over another item and the slot takes its place. The other items slide
   instead of jumping (a "FLIP" animation: note where everything was, move it,
   then animate from the old spot to the new one).
4. Near the top or bottom of the window, the page scrolls by itself.
5. Let go, and the new order is saved.

On a phone, touching a picture must still scroll the page, so fingers drag the
⠿ grip instead. The CSS `touch-action: none` on the grip tells the browser
"a finger here drags, it does not scroll".

The ← → and ↑ ↓ buttons still exist for keyboard users. After you press one,
focus stays on it, so pressing Enter again keeps moving the same item.

### Changing the web address

If you change `/sets/old-name` to `/sets/new-name`, the old address stops
working. Links you already shared will show "This set does not exist". Pick a good
name early, or keep the old one.

---

## Part B: Security hardening

### 1. Hotlink protection

"Hotlinking" is when another website shows your image by pointing at your server:
`<img src="https://your-site/img/photo.webp">`. Your photo then appears on their
page, and you pay for the traffic.

Browsers say which page asked for an image, in a header called `Referer`. The
image server (`functions/img/[[key]].js`) now refuses any request whose Referer is
another website.

It allows requests **without** a Referer. Opening an image directly, some privacy
settings, and the bots that make link previews in iMessage and LINE all look like
that. Blocking them would break those things, so this is a deterrent, not a wall.

### 2. Security headers

Every page now carries instructions that tell the browser what it is allowed to
do (`lib/security.js` explains each one):

| Header | Protects against |
|---|---|
| `Content-Security-Policy` | Scripts from anywhere but this site. If someone managed to sneak `<script>` into a caption, the browser would refuse to run it. |
| `X-Frame-Options: DENY` | Your admin page being hidden inside another site to trick you into clicking ("clickjacking"). |
| `X-Content-Type-Options` | Browsers guessing file types and running a "picture" as code. |
| `Referrer-Policy` | Leaking full page addresses to other sites. |
| `Permissions-Policy` | Any page asking for your camera, microphone, or location. |
| `Strict-Transport-Security` | Anyone downgrading the connection from HTTPS to plain HTTP. |

Image responses get an extra rule that forbids running any code at all, so even a
file with hidden script inside could not do anything.

### What was already in place

| Protection | Since |
|---|---|
| Password stored only as a slow, salted hash | Lesson 2 |
| Signed, HttpOnly, SameSite=Strict session cookie | Lesson 2 |
| Login checked on the server for every admin request | Lesson 2 |
| Rate limit: 5 wrong passwords per 15 minutes | Lesson 2 |
| Writes refused when they come from another website | Lesson 2 |
| Uploads checked by their first bytes, type, and size | Lesson 3 |
| GPS and all other photo metadata removed | Lesson 3 |
| Secrets kept out of the code and GitHub | Lesson 2 |

### Check it yourself

With `npm run dev` running, in a second Terminal window:

```
curl -I http://localhost:8788/
```

`-I` shows only the headers. You will see `content-security-policy` and the
others. Now pretend to be another website asking for an image:

```
curl -I -H "Referer: https://someone-else.com/" http://localhost:8788/img/seed/forest-1-thumb.svg
```

The answer is `403 Forbidden`.

---

## Part C: Going live

The short version is in the README, under "Put it online". Here is what each step
does.

1. **`npx wrangler login`** opens your browser so you can allow the `wrangler`
   tool to manage your Cloudflare account.
2. **`npx wrangler d1 create portfolio-db`** creates the real database (until now
   it only existed on your Mac). It prints an id like
   `a1b2c3d4-...`. Paste it into `wrangler.toml`, replacing the zeros, so
   the site knows which database is its own.
3. **`npm run db:migrate:remote`** runs the files in `migrations/` against the real
   database to create the tables.
4. **R2** stores the image files. Cloudflare asks for a payment method before
   turning it on, even though 10 GB per month are free. The storage meter on your
   dashboard shows how close you are.
5. **`npm run deploy`** uploads `public/` and `functions/`. The first time, it
   creates the Pages project and prints your address, like
   `https://photo-portfolio.pages.dev`.
6. **Secrets.** The live site cannot read `.dev.vars` on your Mac, so store the
   two values on Cloudflare. Run `npm run hash-password` (it prints them), then
   `npx wrangler pages secret put ADMIN_PASSWORD_HASH` and paste. Do the same for
   `SESSION_SECRET`.
7. **`npm run deploy`** once more, so the new deployment uses the secrets.

Then open `https://<your-address>/admin`, log in, and upload your first real set.

### Your own domain name (optional)

In the Cloudflare dashboard, open **Workers & Pages**, then your project, then
**Custom domains**, and follow the steps. If the site will answer on two names
(for example `example.com` and `www.example.com`), add both to `ALLOWED_HOSTS` in
`wrangler.toml` (remove the `#` in front of the `[vars]` lines) and deploy again,
so images work on both.

### Updating the live site later

```
git pull                    # or after your own changes
npm run db:migrate:remote   # only needed when migrations/ has a new file
npm run deploy
```

---

## What you built

Over five lessons you built, and learned how each part works:

- A public gallery with a no-jump photo grid and a full-screen viewer
- A password-protected admin area with real server-side security
- An upload system that processes 25 MB photos in the browser, adds watermarks,
  and strips location data
- Tools to manage everything: sets, order, covers, captions, deleting
- Security headers, hotlink protection, and a site that costs $0 to run

Ideas if you want to keep going: support iPhone HEIC photos, a logo image as the
watermark, an "About me" page, or a contact form.
