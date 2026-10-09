# Lesson 11: Hero, cover cards, dark mode, and watermark styles

This lesson makes the site feel more like a photography portfolio:

1. A big **hero** photo at the top of the home page.
2. **Cover cards**: each set is a large photo with its title, date, and photo count.
3. A **light / dark switch** in the header.
4. A choice between a **full** and a **small** watermark when you upload.

---

## Part A: The hero and the cover cards

The hero is the cover of your **first** set (the one at the top of the list on
the admin page), shown wide, with your tagline over it and a "Featured" link
into that set. To feature a different set, drag it to the top on the admin page.

The hero only appears on the main home page. A category page (for example
`/?category=landscape`) shows the plain tagline and the cards, so the filtered
sets come first.

Each card is now one big cover photo. The title, date, and photo count sit on
a dark fade at the bottom, so white text stays readable on any picture.

**The date** comes from the new **Date** box on each set's admin page (for
example when you took the photos) and shows as month and year, like "July 2025".
Left empty, the card shows the month you created the set. It is stored in the
new `shot_date` column (`migrations/0006_set_date.sql`).

Files: `lib/render.js` (`heroHtml`, `setCardHtml`), `functions/index.js`,
and the "Home: hero" part of `public/css/style.css`.

## Part B: Light and dark mode

Before, the site followed the device setting only. Now the moon / sun button in
the header lets each visitor choose, and their browser remembers it.

How it works (`public/js/theme.js`):

- The choice is saved in `localStorage` and written onto the page as
  `<html data-theme="dark">` (or `"light"`).
- `style.css` keeps every color in a variable (`--bg`, `--text`, ...). Dark
  colors apply when the device is dark **and** the visitor did not pick light,
  or when the visitor picked dark.
- `theme.js` is loaded in `<head>` without `defer`, so it runs **before** the
  page is drawn. Without that, a visitor who chose dark would see a white flash
  on every page.
- With no saved choice, the site still follows the device, including when it
  switches automatically at sunset.

## Part C: Full or small watermark

On a set's admin page, "Watermark and downloads" now has a **Style** switch:

| Style | Looks like | Good for |
|-------|------------|----------|
| Full | The text repeated diagonally across the whole photo | Work you most want to protect |
| Small | One line in the bottom-right corner | Showing photos with the least distraction |

Your choice is remembered in this browser, like the watermark text. It is
locked while photos are waiting in the list, because the watermark is drawn
into the files while they are being shrunk.

> As before, the watermark is **baked into the image files**. Changing the
> switch affects photos you upload afterwards. To change an existing photo,
> delete it and upload it again with the other style.

The code is `drawCornerWatermark` and `drawTiledWatermark` in
`public/js/image-worker.js`.

## Deploy

```
cd ~/project-0
git pull
npm run db:migrate:remote
npm run deploy
```

The migration adds the date column. Run it before deploying.
