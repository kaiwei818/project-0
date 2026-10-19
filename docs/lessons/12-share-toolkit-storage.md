# Lesson 12: Share buttons, the watermark toolkit, and the storage limit

This lesson adds three things:

1. **Share buttons** on set pages, the home page, and the About page.
2. A **watermark toolkit** in the admin area that marks your full-size originals
   on your own computer, without uploading or storing them.
3. A **storage limit** per photo, so a set of 60 photos stays under about 150 MB.

---

## Part A: Share buttons

- On a set page, the **Share** button sits next to the title.
- On the home page and the About page, it is the round arrow icon in the header,
  next to the light / dark switch.

What happens when someone taps it (`public/js/share.js`):

- **On a phone:** the phone's own share sheet opens, with every app the visitor
  has (Messages, LINE, Instagram, WhatsApp, AirDrop, ...). This is the Web Share
  API (`navigator.share`).
- **On a computer:** a small menu opens: **Copy link**, **LINE**, **Facebook**,
  **X**, **WhatsApp**, and **Email**, plus **More options** when the browser has a
  share sheet too.

The link that is shared is the page's clean address (the canonical link), so
it never carries extra bits like `#`. The preview that apps show (picture,
title, description) comes from the link-preview tags the site already had.

## Part B: The watermark toolkit

Open **Admin, Toolkit** (`/admin/toolkit`). It is for photos you want to post
elsewhere: social media, clients, contests.

1. Type the watermark text (it is shared with the upload page).
2. Pick the style (**Full** or **Small**), the strength, the size
   (**Original size** keeps every pixel), and the JPEG quality (95% looks the same
   as the original).
3. Drop your original photos in.
4. Download each one, or **Download all (.zip)**.

How it works:

- `toolkit-worker.js` reads each original at full size, draws the watermark
  with the same code as the upload page (`watermark.js`), and saves a JPEG.
  It runs in the background, one photo at a time, because a 24 megapixel photo
  needs about 100 MB of memory while it is being edited.
- `zip.js` packs the results into one .zip, also in the browser. JPEGs are
  already compressed, so it just stores them (fast, and the files stay identical).
- **Nothing is uploaded.** No request goes to the server while the toolkit
  works, and nothing is saved online. The results only exist in that browser tab
  until you download them; closing the tab throws them away (the page warns you).

Good to know:

- The result is a JPEG, even from a PNG.
- Camera details and location (EXIF) are not copied into the new file. That is
  usually what you want for posting online.
- At 95% the file can be a little bigger than the original. That is normal:
  the watermark adds detail, and your camera may have used a different setting.
- Very large photos can run out of memory, mostly in Safari and on phones. If a
  photo fails, choose **Longest side: 6000 px** and press **Redo with current
  settings**.

## Part C: The storage limit

Before, each photo was saved in four public sizes (800, 1200, 2000, 3000 px),
about 3 to 5 MB in total. Now:

| Size | Long edge | Most it may use | Used for |
|------|-----------|-----------------|----------|
| small | 800 px | 0.2 MB | grids on phones |
| thumb | 1200 px | 0.45 MB | grids on computers, home page cards |
| display | 3000 px | 1.85 MB | the viewer, on every screen |

That is at most about **2.5 MB per photo**, so **60 photos stay under about
150 MB**. In testing, a very detailed 22 MB photo came out at 1.9 MB in total,
and a typical one at 1.7 MB.

How the limit works (`public/js/image-worker.js`):

1. Each size is saved at its normal quality.
2. If the file is bigger than its limit, it is saved again at a lower quality
   (for example 88%, then 82%, 76%, 70% for the display size).
3. If the display file is still too big at 70%, it is made a little smaller
   (2400 px) and saved again.

Most photos fit at the first try, so they look exactly as before.

**The trade-off you chose:** the 2000 px phone version is gone, so phones now
load the 3000 px file in the viewer. Photos open a little slower on phones, but
each photo uses about half the storage.

The upload page shows the storage each photo and the whole batch will use
("Storage: ... MB") before you upload.

> **Clean copies are extra.** If you tick "Also store a clean copy", each photo
> adds about 2 to 4 MB more (a high-quality JPEG for licensed downloads). Those
> are not limited, so the licensed files stay at full quality.

Photos you uploaded before keep their old sizes. To make an existing set
smaller, delete its photos and upload them again.

## Deploy

No database change this time:

```
cd ~/project-0
git pull
npm run deploy
```
