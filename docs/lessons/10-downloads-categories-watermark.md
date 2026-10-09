# Lesson 10: License codes, categories, and the tiled watermark

This lesson adds four things:

1. A stronger, **tiled watermark** on every picture visitors see, thumbnails included.
2. **Clean downloads** for the photos you choose, unlocked by a **license code** you give out.
3. **Categories** (Landscape, Sports, ...) with filter buttons on the home page.
4. The real file behind each download is kept **private**, so the code is the only way in.

---

## Part A: The tiled watermark

The old watermark was one small line in the corner, easy to crop away. Now the
text repeats across the whole picture at an angle, in staggered rows, like the
sample you sent.

It is drawn in your browser while the photo is being shrunk
(`public/js/image-worker.js`, function `drawTiledWatermark`):

| Size | Used for | Watermark |
|------|----------|-----------|
| 3000 px and 2000 px | The full-screen viewer | Strong: bigger text, more visible |
| 1200 px and 800 px | Grid thumbnails and home page covers | Light: smaller, fainter |

Change the look in `WATERMARK_STYLES` at the top of that file: `fill` is the
white text, `stroke` is the thin dark outline that keeps it readable on bright
skies, and `size` is the text height as a share of the picture width.

> **Existing photos keep their old watermark.** The watermark is baked into the
> picture files when you upload. To give an older photo the new look, delete it
> and upload it again.

## Part B: Clean copies and license codes

### How a download works

```
You (admin)                      Visitor                        Server
 upload with "keep a clean        enters code on the set page --> /api/license/check
 copy" ticked                                                    (code valid for this set?)
   |                              Download button appears
   v                              in the viewer
 clean 3000 px JPEG saved         clicks Download -------------> /api/download/<photo>?code=...
 under private/... in R2                                          checks the code AGAIN,
                                                                  counts one download,
                                                                  sends the clean file
```

Key ideas:

- **The clean file is private.** It is stored under `private/` in R2, and the
  normal image address (`/img/...`) refuses anything in that folder. Its
  address never appears in any page. Only `/api/download/...` can send it, and
  only after checking the code.
- **The server checks every time.** The browser remembers the code for the
  current tab, but that is only a convenience. Every download is checked again,
  so switching a code off works immediately.
- **Counting is done in one step.** The database adds one to the download count
  only `WHERE downloads < max_downloads`. Two clicks at the same moment cannot
  both slip past the limit.
- **Guessing is slowed down.** After 10 wrong codes in 15 minutes, a visitor's
  address must wait. Codes look like `WL-7KQ4-M9TX`. They skip letters that are
  easy to confuse (0 and O, 1 and I), and capital letters and spaces do not matter.

### Your steps

1. **Upload with a clean copy.** On a set's admin page, in "Watermark and
   downloads", tick **Also store a clean copy (no watermark) for licensed downloads**, then
   upload. Those photos show a **Downloadable** badge. The ⤓ button on a card
   removes its clean copy.
2. **Make a code.** In the admin, open **License codes**. Give it a label (who it
   is for), tick the sets it opens, and optionally set an end date and a download
   limit. Click **Create code**, then **Copy**.
3. **Give it out** by email or message. The person opens the set, types the code
   in "Have a license code?", then opens a photo and clicks **Download**.
4. **Switch off** a code any time, or delete it.

The code box only shows on sets that have at least one downloadable photo.

## Part C: Categories

- In the admin home page, add categories under **Categories**.
- On each set's admin page, tick the categories it belongs to. A set can be in
  several categories. Changes save by themselves.
- The home page shows **All** plus every category that has a published set.
  Each button is a real address, like `/?category=landscape`, so you can share a
  filtered view, and Google can read it.

## Part D: The database change

`migrations/0005_downloads_categories.sql` adds:

| Table or column | Holds |
|-----------------|-------|
| `photos.download_key` | Where the clean copy is stored, or empty |
| `license_codes` | Each code, its label, end date, limit, count, and on/off |
| `license_code_sets` | Which sets each code opens |
| `license_attempts` | Recent wrong guesses, for slowing down guessing |
| `categories`, `set_categories` | Your categories and which sets are in them |

## Deploy

On your Mac, after merging the pull request:

```
cd ~/project-0
git pull
npm run db:migrate:remote
npm run deploy
```

Run the migration **before** deploying, or the new pages will look for tables
that do not exist yet.

## Honest limits

A code holder gets a clean file and can share it; the code only controls who
gets it from you. Watermarks make copying less attractive but can be edited out
by someone determined. Screenshots of the viewer still work.
