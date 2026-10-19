# Lesson 13: Duplicate warnings, Download all, the activity log, and scheduled publishing

This lesson adds four things:

1. **Duplicate warnings** on the upload page.
2. **Download all** (.zip) for visitors with a license code.
3. An **activity log** in the admin area.
4. **Scheduled publishing**: a set goes public by itself at a time you choose.

All four need the database change in `migrations/0007_duplicates_log_schedule.sql`,
so run `npm run db:migrate:remote` before deploying (see the end).

---

## Part A: Duplicate warnings

When you add photos on a set's admin page, each one is compared with every
photo already on your site (in any set), in three ways:

| Match | How it is found | How sure |
|-------|-----------------|----------|
| The exact same file | A fingerprint of every byte (SHA-256 hash), made in your browser | Certain |
| The same moment | Capture time (to 1/100 second) and camera, from EXIF | Almost certain: for example the same shot exported twice, or edited |
| The same file name | "DSC01234.JPG" (capital letters do not matter) | Only a hint: cameras reuse names after 9999 shots |

A photo with a match gets a **yellow note** (grey for "same name" only) that
names the set it is already in, with a link. You can:

- press **Skip this photo** on one,
- press **Skip all possible duplicates**, or
- ignore the notes and upload anyway (a warning never blocks anything).

The same file added twice to one list is caught too.

How it works:

- `admin-set.js` reads each original file and makes its fingerprint with
  `crypto.subtle` (built into the browser; the original still never leaves your
  computer). `exif.js` reads the capture time.
- `/api/admin/photos/duplicates` looks the three facts up in the database.
- When the photo is uploaded, the three facts are saved with it
  (`original_name`, `original_hash`, `taken_at`), so later uploads can be
  compared with it.

> Photos uploaded **before** this update have no saved facts, so they are never
> matched. Only photos uploaded from now on count.

## Part B: Download all

After a visitor enters a valid code on a set page, a **Download all N (.zip)**
button appears next to the code box (when the set has 2 or more downloadable
photos).

- The browser downloads each clean copy through the normal download address,
  so **every photo is checked and counted**, exactly like single downloads.
- It then packs them into one `.zip` (with `zip.js`, the same code as the
  toolkit) named after the set.
- **The download limit counts photos.** If a code has fewer downloads left than
  the set has photos, the button is turned off with a short explanation, and
  the visitor can still download photos one by one. Give a code a higher limit
  (or none) if you want people to use Download all.
- If something stops it halfway (for example the code was switched off), the
  photos that did arrive are still saved in the .zip, and the page says what
  happened.

The set page also re-checks a remembered code when it opens, so a code you
switched off, or one that ran out, stops showing download buttons straight away.

## Part C: The activity log

Open **Admin, Activity** (`/admin/activity`). Each line has a time (in your
time zone), a kind, a sentence, and the visitor's country (only the country,
never their IP address). The buttons at the top show one kind at a time.

What is recorded:

| Kind | Examples |
|------|----------|
| Uploads | "Uploaded photo #42 (DSC01234.JPG) to "Kyoto", with a clean copy" |
| Deletions | Photos, whole sets, and removed clean copies |
| License codes | Created (with sets and limits), switched off or on, deleted |
| Downloads | "WL-7K3F-Q9XM (Jane) downloaded photo #42 from "Kyoto" (3 of 10 used)", and refused downloads with the reason |
| Publishing | Published, unpublished, scheduled, cancelled, and "went public as scheduled" |
| New sets | Every new set |
| Logins | Successful logins, and wrong passwords |

How it works: `lib/activity.js` has one function, `logActivity`, that every
admin action and every download calls. If writing the log ever fails, the real
action still succeeds. Lines older than a year are cleared out automatically.

**Tip:** wrong-password lines you did not cause mean someone is trying to guess
your password. The login is already rate limited, but a long, unusual password
is the best protection.

## Part D: Scheduled publishing

On a draft set's admin page, the Visibility box now has **"Or make it public
automatically at"**. Pick a date and time (in your own time zone) and press
**Schedule**. The set stays a draft, marked **Scheduled** on the dashboard,
until then. You can **Change time**, **Cancel schedule**, or **Publish now**
at any moment.

How it works: no timer is needed. Every public page asks the database "is
this set published, **or** has its scheduled time passed?" (`lib/visibility.js`).
So at exactly that minute the set appears on the home page, in the sitemap, and
at its address, with nothing running in the background. The time is stored in
UTC (world time), so it is right wherever you are.

When you next open the admin pages, the set is switched to plain "Published",
and the activity log notes that it went public as scheduled.

## Deploy

This lesson changes the database:

```
cd ~/project-0
git pull
npm run db:migrate:remote
npm run deploy
```
