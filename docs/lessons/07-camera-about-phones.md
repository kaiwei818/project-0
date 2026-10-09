# Lesson 7: Camera details, the About page, and faster phones

---

## Before you start: get the update

Two things are different this time, so follow these steps exactly.

**1. Pull with `--rebase`.** Your Mac has a commit that never reached GitHub (the
project name and database id, from when `git push` failed). This update makes the
very same change, so git only needs to line the two up:

```
cd ~/project-0
git pull --rebase
```

`--rebase` means "put my unsent commits on top of the new ones". Git notices your
commit is already included and drops the duplicate. After this, `git push` works
again (once you have set up your token) and has nothing left to send.

**2. Update the database, then publish:**

```
npm run db:migrate:local
npm run db:migrate:remote
npm run deploy
```

`0004_camera_sizes_about.sql` only **adds** things: a camera details column, two
image size columns, and a settings table. Nothing is changed or removed.

**Note about your local test site:** your local test data was stored under the
old placeholder database id (all zeros). Now that `wrangler.toml` has your real id,
`npm run dev` starts with an empty local database. Your **live** site is not
affected at all. Run `npm run seed:local` if you want the sample sets back locally.

---

## Part A: Camera details

When you upload, the page reads the camera facts hidden in each photo (its EXIF
data) and writes one line, for example:

> Sony A7 IV · 35mm · f/1.8 · 1/200s · ISO 100

It appears under the caption in the full-screen viewer.

- **Editable:** every photo card in the admin area has a **Camera details** box.
  Fix a name, add the lens, or clear the box to hide the line for that photo.
- **Camera names:** Sony stores codes like `ILCE-7M4`; the site turns the common
  ones into names like `A7 IV`. If your camera shows a code, add it to
  `MODEL_NAMES` at the top of `public/js/exif.js`, or just edit the box.
- **Older photos** have no camera line (their originals were never uploaded).
  Type one in by hand, or upload them again.
- **Privacy is unchanged:** only these few facts are read. GPS and serial
  numbers are never read, and the uploaded files contain no EXIF at all.

### How it works (`public/js/exif.js`)

A JPEG is a list of blocks. One block, starting with the letters `Exif`, holds a
table of numbered facts: fact `0x010F` is the camera maker, `0x829A` the shutter
speed, `0x829D` the aperture, and so on. Numbers like 1/200 are stored as two
whole numbers (a fraction). The code reads only the first 256 KB of the file,
finds that block, looks up the facts it wants, and formats them.

---

## Part B: The About page

Visitors now see **Work** and **About** at the top of every page.

Edit it in the admin area: on the dashboard click **About page**.

| Field | Shown as |
|---|---|
| Portrait | Your photo, left of the text (above it on phones) |
| Bio | Paragraphs. Leave an empty line between paragraphs |
| Email | A link that opens the visitor's email app |
| Instagram | `@yourname`, linking to your profile. Type it with or without `@`, or paste the link |
| Other link | Any https:// address with a name, for example LINE or YouTube |

Everything saves by itself when you click outside a box. Empty fields are simply
not shown; with no bio yet, the page says "More about me is coming soon."

**Good to know:** an email address on a public page can attract some spam. If
that becomes a problem, leave Email empty and use Instagram or a contact link.

### How it works

`functions/about.js` fills in the page on the server, so Google and link
previews see your bio. Everything you type is "escaped" first: if your bio
contained `<script>`, visitors would just see those characters as text. The
settings live in a small new table, `settings`, one row per setting.

---

## Part C: Faster on phones

Each photo is now saved in four sizes instead of two:

| Size | Long edge | Watermark | Used for |
|---|---|---|---|
| small | 800 px | no | grids on phones |
| thumb | 1200 px | no | grids on computers |
| medium | 2000 px | yes | the viewer on phones and tablets |
| display | 3000 px | yes | the viewer on computers |

The page lists the sizes with `srcset`, and each browser downloads the smallest
one that is still sharp on its screen. In testing on an iPhone-sized screen:

- the viewer loads the 2000 px file instead of the 3000 px one (about half the data)
- the grid loads 800 px files for upright photos instead of 1200 px

Your computer still gets the full 3000 px version. Photos uploaded before this
update keep working with the sizes they have; upload them again to give them the
phone sizes and camera details.

Storage grows a little, about 15 to 20% more per photo; the storage meter shows it.

**Honest note about watermarks:** the grid sizes (800 and 1200 px) have no
watermark, as before, because watermarks on small grid pictures look cluttered.
That means a fairly sharp 1200 px copy of every photo is visible. If you prefer,
I can watermark those too.
