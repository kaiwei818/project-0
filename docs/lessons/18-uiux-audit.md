# Lesson 18: An accessibility and polish pass (the UI/UX Pro Max checklist)

The site was checked against the rules of the "UI/UX Pro Max" skill
(accessibility, touch, speed, layout, text and color, motion). Each problem
was found by one reviewer and checked again by a second. Only confirmed ones
were changed.

## Changes you cannot see (they fix things)

| What was wrong | Now |
|----------------|-----|
| Every photo had the same automatic description, "Photo from <set name>", and it kept the old name after a rename | New photos start without one. The old automatic ones are cleared (database step below); anything you wrote yourself is kept. Write real ones on each set's admin page: empty boxes say "Not written yet" |
| On phones, screen-reader users could not go to the next photo in the viewer | The ‹ › buttons are still there for them, just not drawn; changing photo is read aloud ("Photo 2 of 5") |
| After pinch-zooming a photo, dragging flipped to the next photo or closed the viewer | While zoomed in, one finger looks around the photo |
| On a phone, the photos on a set page jumped down when the Share button appeared | The button is there from the first moment |
| On computers, the viewer showed a photo small, then it grew | It takes its full size at once; the photo you tapped also loads before its neighbors |
| Only the small line of text on the big featured photo opened its set | The whole photo does |
| Tapping a link in the open menu: the header flashed over the menu during the fade | That fade is skipped |
| Keyboard: "Contact" in the menu left focus at the top | Focus moves to the contact links |
| Small links (All sets, Back to top, contact links) were hard to tap | Bigger tap areas, same look |
| The license code error was hard to read in dark mode | A lighter red in dark mode |
| The big "404" was too faint for the contrast rules | It counts as decoration now; "Page not found" says it |

## Changes you can see (you picked these)

- **Photo viewer:** drawn ×, ‹, › icons; the dark background fades in and out
  with the photo; on phones the photo follows your finger while you swipe.
- **Cards and the featured photo:** a slightly darker shade under the white
  text, so it stays readable on bright photos (sky, snow). Headings wrap
  evenly instead of leaving one word alone.
- **Set page:** the description sits close to its title.
- **Menu:** category buttons look like the ones on the home page.
- **Polish:** buttons fade to their hover color; on tablets the About text
  keeps a readable width next to your portrait; small text uses one size.

## Writing good photo descriptions

Say what is in the photo, in a short sentence, as if describing it on the
phone: "A hockey player in white skates past the bench", "Fishing boats in
Keelung harbor at night". No need to start with "Photo of". The set title
and caption are shown separately, so do not repeat them.

## Photos in renamed sets

The database step only clears text it is sure the site wrote: exactly
"Photo from" plus the set's current name. If you renamed a set after
uploading, its photos may still say "Photo from <old name>". Open that set's
admin page and replace those with real descriptions, or clear the boxes.

To see every description that starts with "Photo from" (this only reads, it
changes nothing), run on your Mac:

```
npx wrangler d1 execute portfolio-db --remote --command "SELECT id, alt_text FROM photos WHERE alt_text LIKE 'Photo from %'"
```

## Deploy

This one has a database step (it clears the old automatic descriptions):

```
cd ~/project-0
git pull
npm run db:migrate:remote
npm run deploy
```
