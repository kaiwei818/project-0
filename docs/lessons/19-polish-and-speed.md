# Lesson 19: Blurry previews, photo links, smoother viewer, and faster photos

## Blurry previews while photos load

Each photo now has a tiny preview: its colors boiled down to an 8 pixel grid,
about 250 characters of text stored with the photo (`placeholder` column,
`migrations/0010`). The page shows it blurred in the photo's place, so a set
fills with soft color at once instead of grey boxes, and the real photo appears
on top. Photos further down the page fade in over their preview.

- New uploads get one automatically (`public/js/placeholder.js`, called from
  the upload worker).
- **Older photos** get one the next time you open their set in the admin
  page. Nothing to click: open each set once after deploying.
- A photo that fails to load keeps its preview instead of a broken-image icon.
- Without JavaScript, everything simply appears as it loads, as before.

## A link for every photo

The viewer's address now names the photo: `/sets/harbor-light?photo=3`.

- Copy the address (or share from the phone's browser) to send someone that
  exact photo. The link preview in messages shows that photo too.
- Reloading keeps you on the same photo. **Back** closes the viewer; Forward
  opens it again.
- Google still sees one page per set (the photo addresses point to it).

## The viewer

- The photo grows out of its place in the grid and shrinks back into it
  (Chrome, Edge, Safari 18). Other browsers, and visitors who turned on
  "Reduce motion", get the simple fade.
- Closing puts you back at the photo you looked at last, with keyboard focus
  on it.
- **Home** and **End** jump to the first and last photo.
- A thin line along the top shows when a full-size photo takes a while; if it
  cannot load, a note offers **Try again**.
- Only the *next* photo (in the direction you are going) is downloaded in
  advance, not both neighbors, and none on phones in data-saving mode.

## Faster photos

- Photos are kept in Cloudflare's cache near each visitor
  (`functions/img/[[key]].js`), so after the first visitor in a region they
  come from close by instead of from storage.
- The first photos on a page load first; the rest only when you scroll near
  them. Cards ask for a smaller file where it is still sharp.
- Measured on a test copy (phone, 4G): opening the viewer downloads a third
  less, and nothing loads later than before.

## Look and details

- Smooth "continuous" corners where the browser supports them (Chrome, Edge),
  ordinary rounded corners elsewhere; round things stay round.
- Calmer, more even type; a larger set title with one quiet line under it
  (place, month, number of photos); a little more room for photos on big
  screens; section labels in one small style.
- A site icon (`public/favicon.svg`, a placeholder "w": replace it with your
  own logo any time), the phone browser bar follows light and dark mode, and a
  "Skip to content" link for keyboard users.
- Link previews now include the picture's size and a description.

## Deploy

```
cd ~/project-0
git pull
npm run db:migrate:remote
npm run deploy
```

Then open each set once in the admin page to give older photos their preview.
