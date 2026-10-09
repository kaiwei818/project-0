# winstonlens

Winston Chang's photography portfolio. It runs on Cloudflare's free tier:

- **Public gallery:** sets (albums) of photos, a full-screen viewer with swipe and
  keyboard controls and camera details, an About page, link previews when you
  share a page, and images sized for each screen so phones load fast.
- **Private admin area** at `/admin`: create sets as private drafts, publish,
  rename, reorder, and delete them;
  upload photos (shrunk and watermarked in your browser, so originals never leave
  your computer); reorder photos, choose covers, and write captions and
  descriptions; watch your storage use, overall and per set.

The original plan is in [photo-portfolio-spec.md](photo-portfolio-spec.md).

## Learning guide

1. [How the site works, and running it on your Mac](docs/lessons/01-setup-and-gallery.md)
2. [The admin login](docs/lessons/02-admin-login.md)
3. [Creating sets and uploading photos](docs/lessons/03-uploads.md)
4. [Photo viewer, deleting, and sharper photos](docs/lessons/04-viewer-delete-quality.md)
5. [Managing photos, security, and going live](docs/lessons/05-manage-secure-deploy.md)
6. [Branding, drafts, search engines, and the 404 page](docs/lessons/06-brand-drafts-seo.md)
7. [Camera details, the About page, and faster phones](docs/lessons/07-camera-about-phones.md)
8. [Moving to your own domain](docs/lessons/08-custom-domain.md)

---

## Run it on your computer

You need [Node.js](https://nodejs.org) (the LTS version). Then, in Terminal:

```
git clone https://github.com/kaiwei818/project-0.git
cd project-0
npm install
npm run db:migrate:local   # create the local database tables
npm run hash-password      # choose your admin password (saved to .dev.vars)
npm run dev                # open http://localhost:8788
```

Optional: `npm run seed:local` adds three sample sets. **It replaces everything in
your local database**, so only use it on a fresh setup.

Local data lives in the hidden `.wrangler` folder. It never touches the live site.

## Put it online (Cloudflare)

Do these once, in this order. Lesson 5 explains each step in detail.

1. Create a free account at https://dash.cloudflare.com/sign-up, then log in from Terminal:
   ```
   npx wrangler login
   ```
2. Create the database, and copy the `database_id` it prints into `wrangler.toml`:
   ```
   npx wrangler d1 create portfolio-db
   ```
3. Create the database tables:
   ```
   npm run db:migrate:remote
   ```
4. Turn on R2 in the Cloudflare dashboard (left menu, **R2 Object Storage**; it asks
   for a payment method but the first 10 GB are free), then create the bucket:
   ```
   npx wrangler r2 bucket create portfolio-images
   ```
5. Deploy for the first time. If it asks questions, create the project as
   `winstonlens` with `main` as the production branch:
   ```
   npm run deploy
   ```
6. Store your admin username, password hash, and session secret on Cloudflare.
   `npm run hash-password` prints all three values; paste each one when asked:
   ```
   npx wrangler pages secret put ADMIN_USERNAME
   npx wrangler pages secret put ADMIN_PASSWORD_HASH
   npx wrangler pages secret put SESSION_SECRET
   ```
7. Deploy again so the secrets take effect:
   ```
   npm run deploy
   ```

Your site is at the address the deploy prints, like `https://photo-portfolio.pages.dev`.
After any code change, run `npm run deploy` again. If a change adds a file to
`migrations/`, run `npm run db:migrate:remote` first.

## Settings

The site name, owner, and description are in `lib/site.js`. Change them there and
deploy; every page picks them up.

| Name | Where | Required | What it is |
|------|-------|----------|------------|
| `ADMIN_USERNAME` | `.dev.vars` locally; `wrangler pages secret put` live | Yes | Your admin login name, for example your email. Capital letters do not matter. |
| `ADMIN_PASSWORD_HASH` | same | Yes | Your admin password, hashed. Made by `npm run hash-password`. |
| `SESSION_SECRET` | same | Yes | Random text that signs login cookies. Changing it logs everyone out. |
| `ALLOWED_HOSTS` | `[vars]` in `wrangler.toml` | No | Extra domain names allowed to show your images, comma separated. Only needed when the site has more than one domain. |
| `DB` | `wrangler.toml` | Yes | The D1 database (`database_id` from step 2). |
| `BUCKET` | `wrangler.toml` | Yes | The R2 bucket for images. |

Secrets never go in the code or on GitHub. `.dev.vars` is listed in `.gitignore`.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Run the site locally at http://localhost:8788 |
| `npm run hash-password` | Set the admin username and password |
| `npm run db:migrate:local` | Apply database changes locally |
| `npm run db:migrate:remote` | Apply database changes to the live site |
| `npm run seed:local` | Replace local data with three sample sets |
| `npm run deploy` | Publish to Cloudflare Pages |

## How it fits together

```
public/                  Files sent to browsers as they are
  index.html, set.html     Public pages
  admin/                   Admin pages (protected by functions/admin/_middleware.js)
  about.html               The About page (filled in by functions/about.js)
  js/                      Browser code (image-worker.js shrinks photos, exif.js reads camera
                           details, images.js picks image sizes, lightbox.js is the viewer)
  css/style.css            All styling, light and dark mode
  404.html                 The "page not found" page
functions/               Server code; the file path is the web address
  _middleware.js           Runs for every request: security headers, site name
  index.js                 Home page link-preview tags
  robots.txt.js, sitemap.xml.js   For search engines
  api/sets/                Public data (read only)
  api/admin/               Admin data; _middleware.js checks the login for all of it
  img/[[key]].js           Serves images from R2, with hotlink protection
  sets/[slug].js           Set pages with link-preview tags
lib/                     Shared server code: site name (site.js), settings, login, slugs, ordering, security headers, page tags
migrations/              Database tables, one numbered file per change
scripts/                 hash-password and seed-local
```

## API

Public (read only):

- `GET /api/sets`: all published sets with cover and photo count
- `GET /api/sets/:slug`: one set with its photos (drafts only when logged in)
- `GET /about`: the About page
- `GET /robots.txt`, `GET /sitemap.xml`: for search engines
- `GET /img/:key`: an image file (refuses other websites)

Admin (login required; writes must come from this site):

- `POST /api/admin/login`, `POST /api/admin/logout`
- `GET /api/admin/stats`: storage used, in total and per set
- `GET /api/admin/sets`, `POST /api/admin/sets`
- `PATCH /api/admin/sets/order`: order of sets
- `GET`, `PATCH`, `DELETE /api/admin/sets/:id`: one set (title, slug, description, cover, published)
- `PATCH /api/admin/sets/:id/reorder`: order of photos in a set
- `POST /api/admin/photos`: upload one photo (thumbnail and display version)
- `PATCH`, `DELETE /api/admin/photos/:id`: caption, alt text, camera details, delete
- `GET`, `PATCH /api/admin/about`: About page bio and contact details
- `POST`, `DELETE /api/admin/about/portrait`: About page portrait

## Honest limits

- Nothing on the web can fully stop people from saving images. This site only
  serves watermarked, resized copies (originals never go online), blocks
  right-click saving, and stops other websites from embedding your images.
  Screenshots still work.
- One admin account. Logging out removes the cookie from that browser; to log out
  everywhere, run `npm run hash-password` and update both secrets.
