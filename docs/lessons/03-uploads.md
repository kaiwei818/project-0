# Lesson 3: Creating sets and uploading photos

This lesson covers build step 5 from the spec: the upload flow. Your browser
shrinks each photo, adds the watermark, and uploads only the small versions.
The 25 MB original never leaves your Mac.

---

## Part A: The journey of one photo

```
Your Mac (browser)                                         Cloudflare
-------------------------------------------------          ------------------------
photo.jpg (25 MB, 6000 x 4000, has GPS in EXIF)
   |
   |  Web Worker (background thread)
   |   1. decode the JPEG into pixels (about 100 MB of memory)
   |   2. turn it upright using the camera's rotation flag
   |   3. shrink to 2000 px  -> "display"
   |   4. shrink display to 500 px -> "thumb"
   |   5. draw the watermark on display only
   |   6. save both as WebP (JPEG in Safari)
   |      Saving creates new files, so the EXIF and GPS data is gone.
   v
thumb (about 50 to 100 KB) + display (about 300 KB to 1 MB)
   |
   |  you check the preview, then click Upload
   |  POST /api/admin/photos  (a form with both files)  ---->  login check (middleware)
   |                                                          check the files really are
   |                                                            images, and under 5 MB
   |                                                          save both files to R2
   |                                                          add a row to "photos" in D1
```

### Why the browser does the shrinking

- **Cost.** Image processing on a server costs money or needs a paid plan. Your
  computer does it for free.
- **Privacy.** The original never travels over the internet, so it cannot leak.
- **Speed.** Uploading 800 KB is about 30 times faster than uploading 25 MB.

### Why a Web Worker

JavaScript on a page runs on one thread, the same one that draws the page and
reacts to clicks. Decoding a 25 MB photo takes about a second. Done on that
thread, the page would freeze for a second per photo. A **Web Worker** is a
second thread with no access to the page, so the heavy work happens there and
the page stays smooth.

When tested with 22 MB photos, the page never froze for longer than 36 ms (a
smooth animation needs a new frame about every 16 ms, and anything under 100 ms
feels instant).

### Why two at a time

Each photo being processed holds about 100 MB of pixels in memory. Two at a
time keeps your computer busy without running out of memory. Uploads also go two
at a time.

---

## Part B: Tour of the new files

```
public/js/image-worker.js            The worker: shrink, watermark, save (read this one first)
public/admin/set.html                Upload page layout
public/js/admin-set.js               Upload page logic: queue, preview, upload
functions/api/admin/sets/index.js    GET: list sets. POST: create a set
functions/api/admin/sets/[id].js     GET: one set with its photos
functions/api/admin/photos/index.js  POST: receive one photo, check it, store it
```

### Ideas worth knowing

- **Magic bytes.** Every JPEG starts with the bytes `FF D8 FF`, and every PNG
  starts with `89 50 4E 47`. The server checks those first bytes instead of
  trusting the file name, since anyone can rename `virus.exe` to `photo.jpg`.
- **Never trust the browser.** The upload page only sends good files, but
  someone could skip it and send anything straight to the API. That's why the
  server checks the type, the size, and the numbers again.
- **Unique keys.** Each upload gets a random name like
  `photos/4/d9ca9cd4-...-display.webp`. A file at a given name never changes,
  which is what allows the "cache for a year" header from Lesson 1.
- **Cleaning up on failure.** If saving the files works but adding the database
  row fails, the server deletes the files. Otherwise they would take up storage
  forever while being invisible.
- **Slugs in any language.** The set "台北夜景" gets the address
  `/sets/台北夜景`. Browsers send that as `%E5%8F%B0...`, so the server decodes
  it before looking it up. (This fixed a bug in Lesson 1's code that only showed
  up with Chinese titles.)

---

## Part C: Try it on your Mac

1. Get the new code and restart the site (press Ctrl + C to stop it first):
   ```
   git pull
   npm run dev
   ```
2. Open http://localhost:8788/admin and log in.
3. Type a title under **Sets** and click **Create set**. The upload page opens.
4. In **Watermark**, type your text, for example `© Your Name`. The page
   remembers it next time.
5. Drag a few real photos onto the dashed box, or click it to choose files.
6. Watch each card go from **Shrinking...** to **Ready**, with sizes like
   `24.8 MB → 82 KB + 640 KB`. Check the big watermark preview.
7. Click **Upload**, then **View set** in the top right corner.

### Things to notice

- Try a portrait photo from your phone. It should stand upright.
- Change the watermark text while photos are listed: you can't, because the
  watermark is baked in while shrinking. Click **Clear list** to change it.
- Look at a dashboard storage number before and after uploading.
- Open Activity Monitor while processing 20 photos: you will see the browser use
  a lot of CPU for a short time, but the page stays responsive.

### What's normal

- Safari makes JPEG instead of WebP, so files are about 30% larger there.
  Chrome makes WebP.
- Very detailed photos (leaves, grass, sand) produce larger files than smooth
  ones (sky, studio backgrounds). A display file between 300 KB and 1 MB is the
  target.

---

## Honest limits

- The watermark makes stolen copies less useful. It does not stop screenshots,
  and someone with photo-editing skill can remove it.
- Photos get the alt text "Photo from <set title>" for now. Lesson 4 lets you
  write a real description for each photo, which helps blind visitors and Google.
- HEIC files (the iPhone default) are not accepted yet. Export to JPEG first, or
  set iPhone Camera to **Most Compatible**.

## Coming next

**Lesson 4:** managing sets and photos: rename and delete sets, reorder photos,
choose the cover, edit captions and alt text, and delete photos.
