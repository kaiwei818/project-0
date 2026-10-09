# Lesson 4: Photo viewer, deleting, and sharper photos

This lesson comes from your feedback after Lesson 3. It covers three things:
sharper photos, deleting sets and photos, and a full-screen viewer for visitors.

---

## Part A: Sharper photos

**What you saw:** photos looked soft, as if they had lost quality.

**The main cause: Retina screens.** A Mac or iPhone screen has 2 or 3 real pixels
for every "point" that web pages measure in. A photo shown 470 points wide in the
album grid therefore needs about 940 real pixels to look sharp. The old thumbnails
were only 500 pixels wide, so the screen stretched each one to about twice its
size, and stretching always looks blurry.

**The new settings**, at the top of `public/js/image-worker.js`:

| | Before | Now |
|---|---|---|
| Thumbnail (grids) | 500 px, quality 0.75 | **1200 px, quality 0.85** |
| Large version (viewer) | 2000 px, quality 0.80 | **3000 px, quality 0.90** |

"Quality" is how hard the JPEG or WebP format squeezes the file: 1.0 is the best
quality and the largest file. Above 0.9, files grow fast while the eye sees
almost no difference.

**The cost:** a photo now uses about 2 to 4 MB of storage instead of about
0.5 to 1 MB. 10 GB of free storage holds roughly 3,000 photos, about 120 sets of
25. The dashboard storage meter shows where you are.

**Important:** photos you already uploaded keep the old size. To make them sharp,
delete them and upload them again.

To change the settings later, edit the four numbers at the top of
`image-worker.js`. The server accepts files up to 15 MB each (set in
`functions/api/admin/photos/index.js`).

---

## Part B: Deleting

- **Dashboard:** each set has a red **Delete** button.
- **Set page:** each photo has a **×** in its corner, and a red **Delete this
  set** box sits at the bottom.

Every delete asks "Are you sure?" first, because it cannot be undone.

### What a delete does on the server

```
DELETE /api/admin/photos/12
   1. find photo 12's two file names
   2. database: if it was a set's cover, clear that; delete the row
   3. storage: delete both files
```

**Why the database goes first:** once the row is gone, the website no longer
links to the files. If step 3 then failed, the only result would be two unused
files. Doing it the other way round could leave broken images showing on your
site.

The new files are `functions/api/admin/photos/[id].js` and the `onRequestDelete`
part of `functions/api/admin/sets/[id].js`.

### A bug fixed along the way

Uploads used to run two at a time. The server places each photo after the last
one it received, so whichever upload finished first came first, and photos could
end up out of order. Uploads now go one at a time, in the order you chose them.
This barely changes the speed, because each file is only a few MB.

---

## Part C: The photo viewer (lightbox)

Visitors tap a photo to open it full screen, as large as the screen allows
while still showing the whole photo. A portrait photo on a phone held upright
uses the full width, and a landscape photo on a computer uses the full height.

| Action | Phone | Computer |
|---|---|---|
| Next / previous | swipe left / right | arrow keys or the ‹ › buttons |
| Close | swipe down, tap ×, or the Back button | Escape or × |
| Zoom in further | pinch with two fingers | |

The file is `public/js/lightbox.js`. Ideas worth knowing:

- **`<dialog>`.** A built-in HTML element for pop-ups. The browser already handles
  showing it above everything, closing it on Escape, and keeping keyboard focus
  inside it.
- **Thumbnail first, then the large version.** The viewer instantly shows the
  thumbnail it already has, then quietly swaps in the 3000 px version when it
  arrives. You never stare at a blank screen.
- **Preloading.** While you look at a photo, the next and previous ones download
  in the background, so swiping feels instant.
- **The Back button.** On phones people press Back to close things. Opening the
  viewer adds a history entry (`history.pushState`), so Back closes the viewer
  instead of leaving the page.
- **Buttons, not plain images.** Each photo in the grid is a `<button>`, so
  keyboard users can Tab to it and press Enter, and screen readers announce it.
- **`object-fit: contain`.** The CSS that says "as big as possible, but show the
  whole photo, never crop".

### A small deterrent

Right-clicking a photo no longer offers "Save Image", and long-pressing on an
iPhone no longer shows the save menu. To be honest about it: this only stops
casual saving. Screenshots still work, and nothing on the web can fully prevent
copying. The watermark is the real protection.

---

## Try it on your Mac

Stop the site with Ctrl + C, then:

```
git pull
npm run dev
```

1. Open http://localhost:8788/admin, delete an old set, and upload the same
   photos again. Notice how much sharper the grid looks.
2. Open the set on the public site and click a photo. Try the arrow keys and Escape.
3. **Test on your iPhone.** Your Mac and iPhone must be on the same Wi-Fi. Stop
   the site and start it like this instead:
   ```
   npm run dev -- --ip 0.0.0.0
   ```
   Find your Mac's address in **System Settings > Wi-Fi > Details** (for example
   `192.168.1.23`) and open `http://192.168.1.23:8788` in Safari on the phone.
   Try swiping, pinching, and the Back gesture.
