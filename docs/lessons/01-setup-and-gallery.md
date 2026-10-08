# Lesson 1: How the site works, and running it on your Mac

This lesson covers build steps 1 to 3 from `photo-portfolio-spec.md`:
the project scaffold, the database, and the public gallery with sample data.

---

## Part A: The big picture

A website is files and programs that live on a computer somewhere (a "server").
When someone opens your site, their browser asks the server for things, and the
server answers.

Our site has four parts:

| Part | What it is | Where it lives in this project |
|------|------------|--------------------------------|
| **Frontend** | The pages people see: HTML (structure), CSS (looks), JavaScript (behavior) | `public/` |
| **API** | Small programs that answer questions like "what sets exist?" with data | `functions/` |
| **Database (D1)** | Tables of text and numbers: set titles, photo order, captions | `migrations/` describes the tables |
| **Storage (R2)** | The actual image files | Filled by the upload page (lesson 3) |

What happens when someone opens the home page:

```
Browser                     Cloudflare
  |  GET /                     |
  |--------------------------->|  sends public/index.html, style.css, home.js
  |                            |
  |  GET /api/sets             |  (home.js asks for data)
  |--------------------------->|  functions/api/sets/index.js asks D1, replies with JSON
  |                            |
  |  GET /img/seed/...svg      |  (one request per cover image)
  |--------------------------->|  functions/img/[[key]].js reads the file from R2
```

**JSON** is just text shaped like data, for example:
`[{"title":"Forest","photo_count":6}]`. The API sends it, and JavaScript reads it.

---

## Part B: Tour of the files

```
public/
  index.html          Home page skeleton (empty grid)
  set.html            Set page skeleton
  css/style.css       All the styling, light and dark mode
  js/home.js          Fetches /api/sets and builds the set cards
  js/set.js           Fetches /api/sets/<slug> and builds the thumbnails
functions/
  api/sets/index.js   GET /api/sets
  api/sets/[slug].js  GET /api/sets/<slug>
  sets/[slug].js      GET /sets/<slug>: serves set.html with the right title and preview tags
  img/[[key]].js      GET /img/<key>: streams an image from R2
migrations/
  0001_init.sql       Creates the "sets" and "photos" tables
scripts/
  seed-local.mjs      Fills your LOCAL database with sample sets
wrangler.toml         Tells Cloudflare where everything is
package.json          Lists the tools this project needs, and shortcut commands
```

Read the files in this order. Each one has comments that explain it:
`migrations/0001_init.sql`, then `functions/api/sets/index.js`, then
`public/index.html`, then `public/js/home.js`, then `public/css/style.css`.

### Ideas worth knowing

- **File-based routing.** In `functions/`, the file path becomes the URL.
  `functions/api/sets/index.js` answers `/api/sets`. A name in square brackets,
  like `[slug].js`, matches any value, so `/api/sets/forest` gives `slug = "forest"`.
- **SQL.** The language for asking a database questions. `SELECT title FROM sets`
  means "give me the title of every set".
- **The `?` in SQL plus `.bind(value)`.** Never paste user input directly into
  SQL text. `bind` passes it safely, which blocks "SQL injection" attacks.
- **`textContent` instead of `innerHTML`.** `textContent` shows text as text.
  If a caption ever contained `<script>`, it would show up as plain text instead of running.
- **`loading="lazy"`.** The browser only downloads an image when you scroll near it.
  This is how the home page stays under 1 MB.
- **Migrations.** Numbered SQL files. Later, when we need a new column, we add
  `0002_something.sql` instead of editing `0001`, so every database ends up the same.

---

## Part C: Run it on your Mac

You only do steps 1 and 2 once.

### 1. Install the tools

Open the **Terminal** app (press Cmd + Space, type "Terminal").

- **Node.js** runs JavaScript tools on your computer. Download the "LTS" version from
  https://nodejs.org and install it. Check it worked:
  ```
  node -v
  ```
  You should see a version like `v22.x.x`.
- **Git** keeps the history of your code. Type `git --version`. If macOS offers to
  install "command line developer tools", click Install.

### 2. Download the project

```
cd ~/Documents
git clone https://github.com/kaiwei818/project-0.git
cd project-0
git checkout claude/jolly-newton-ll2ocp
npm install
```

What each line does:
- `cd` = "change directory", which moves you into a folder.
- `git clone` copies the project from GitHub to your Mac.
- `git checkout` switches to the branch where this lesson's code lives.
  (After you merge the pull request, you can skip this line and stay on `main`.)
- `npm install` downloads the tools listed in `package.json` (here, only `wrangler`)
  into a `node_modules` folder.

### 3. Create sample data

```
npm run seed:local
```

This creates a local copy of the database and storage on your Mac in a hidden
`.wrangler` folder, then adds 3 sample sets. It takes about a minute. Nothing goes
to the internet.

### 4. Start the site

```
npm run dev
```

Open http://localhost:8788 in your browser. `localhost` means "this computer".
You should see three colored sample sets. Click one to open it.

Press **Ctrl + C** in Terminal to stop the server.

### Try this

1. Open `public/css/style.css`, change `--bg: #fafaf9;` to another color, save,
   and refresh the browser.
2. Open http://localhost:8788/api/sets directly. That raw JSON is exactly what
   `home.js` receives.
3. In the browser, right click, choose **Inspect**, then open the **Network** tab
   and refresh. You can watch every request from the diagram in Part A.

---

## Part D: Put it on the internet (Cloudflare)

You can do this now or after the admin pages are built. Everything here fits in
the free tier.

> **Heads up about R2:** Cloudflare asks for a payment method before it turns on R2,
> even for the free tier. You will not be charged while you stay under 10 GB of
> storage. If you would rather not add a card yet, keep working locally. Everything
> above works without an account.

1. Create a free account at https://dash.cloudflare.com/sign-up.
2. Log in from Terminal (this opens your browser):
   ```
   npx wrangler login
   ```
3. Create the database:
   ```
   npx wrangler d1 create portfolio-db
   ```
   It prints a `database_id`. Copy it into `wrangler.toml` in place of the zeros.
4. Create the tables in the real database:
   ```
   npm run db:migrate:remote
   ```
5. Turn on R2 in the dashboard (left menu: **R2 Object Storage**), then:
   ```
   npx wrangler r2 bucket create portfolio-images
   ```
6. Deploy:
   ```
   npm run deploy
   ```
   The first time, it asks for a project name. Use `photo-portfolio`. It prints
   your live address, something like `https://photo-portfolio.pages.dev`.

The live site will say "No sets yet." That is correct, because the sample data
only exists on your Mac. Real photos come from the upload page in lesson 3.

---

## Coming next

- **Lesson 2:** Admin login (spec step 4). Password hashing, session cookies, and
  why the server must check every request.
- **Lesson 3:** The upload page (spec step 5). Your browser shrinks the 25 MB
  original down to two small files, adds a watermark, and uploads only those.
- **Lesson 4:** Managing sets and photos, the lightbox viewer, and security hardening
  (spec steps 6 to 9).
