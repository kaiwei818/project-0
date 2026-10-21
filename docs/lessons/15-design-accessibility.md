# Lesson 15: A more polished and accessible site

The look stays the same; the details are refined, and the site works better
for everyone, including people who use a keyboard, a screen reader, larger
text, or reduced motion settings.

## How it was checked

Every public page and every admin page was tested with **axe**, the standard
free accessibility checker (the same engine as in Chrome's Lighthouse), against
the WCAG 2.2 AA rules, in light and dark mode. It found three problems, now fixed:

- the big "404" on the not-found page was too faint
- the "Cover" badge on the admin set page had white text on light yellow
- switched-off license codes were faded so much that their text was hard to read

All pages now pass with no issues. Automated checks cannot catch everything,
so keyboard use and screen reader announcements were also tested by hand.

You can run the same check yourself: in Chrome, right-click a page, **Inspect**,
then the **Lighthouse** tab, tick **Accessibility**, and click **Analyze**.

## What changed for accessibility

| Change | Who it helps |
|--------|--------------|
| **Skip to content** link: press Tab on any page and it appears top left | Keyboard and screen reader users skip the header |
| The photo viewer announces "Photo 2 of 12" plus the description, each time the photo changes | Screen reader users (before, it read "2 slash 12") |
| Clearer focus outline, a little further from the element | Keyboard users see where they are |
| Bigger tap areas for header links, "All sets", and footer links | Phone users |
| Stronger dark fade behind text on photos (cards, hero) | Everyone, on bright photos |
| More contrast when the device asks for it (`prefers-contrast`) | People with low vision |
| Almost no animation when the device asks for it (`prefers-reduced-motion`) | People who get dizzy from motion |
| The code box is linked to its help and error text (`aria-describedby`) | Screen reader users hear why a code failed |
| Chinese fonts listed (PingFang TC, Microsoft JhengHei) | Chinese titles look right on every computer |

## What changed in the look

- Larger, tighter headings, and a slightly softer color for long text.
- Set pages: "← All sets", a bigger title, and a details line under it:
  **date · location · number of photos**.
- Cards lift a little with a soft shadow on hover; thumbnails zoom very slightly.
- A footer with links: Work, About, Back to top.
- A tidier header and a shorter hero on phones.
- Small transitions on buttons and filter chips.

All of it is in `public/css/style.css`. The colors are variables at the top of
the file (`--bg`, `--text`, `--text-soft`, `--muted`, ...), so changing one
color there changes it everywhere, in light and dark mode.
