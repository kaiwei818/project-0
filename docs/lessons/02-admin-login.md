# Lesson 2: The admin login

This lesson covers build step 4 from the spec: a private `/admin` area that only
you can open. It also explains the scrolling fix from your feedback on Lesson 1.

---

## Part A: First, the scrolling fix

**What you saw:** photos in a set jumped around while you scrolled.

**Why:** the set page used a CSS feature called `columns`, which flows photos down
column 1, then column 2, then column 3, and tries to make the columns even. Photos
load lazily (only when you scroll near them), and each time one finished loading
its height could change by a pixel. That made the browser re-balance the columns,
which pushed photos from one column into the next. Safari does this more than
Chrome.

**The fix:** "justified rows", the layout Flickr and Google Photos use. Photos sit
in rows from left to right, every photo in a row has the same height, and each
keeps its own shape. The important part: the space for each photo comes from its
width and height **stored in the database**, so the layout is decided before any
image downloads. Nothing can move afterwards.

Read the comment above `.photo-grid` in `public/css/style.css` for how the
`flex-grow` trick works.

**Lesson to keep:** when content loads in later (images, ads, fonts), reserve its
space up front. Pages that jump while loading feel broken even when they work.
Google measures this as "Cumulative Layout Shift".

---

## Part B: How the login works

### The big idea: the server is the lock, not the page

Hiding an "Upload" button from strangers does nothing for security. Anyone can
skip your page and send requests straight to `/api/admin/...` using a tool like
`curl`. So **every** admin request is checked on the server, by a "middleware":
code that runs before the real endpoint.

```
Browser                              Server
  |  POST /api/admin/login            |
  |  {"password": "..."}              |
  |---------------------------------->|  1. too many wrong tries? -> 429
  |                                   |  2. hash the password, compare with
  |                                   |     ADMIN_PASSWORD_HASH
  |  Set-Cookie: session=...          |  3. correct: make a signed cookie
  |<----------------------------------|
  |                                   |
  |  GET /api/admin/stats             |
  |  Cookie: session=...              |
  |---------------------------------->|  _middleware.js: is the signature valid
  |                                   |  and not expired? If not -> 401.
  |  {"bytes_used": ...}              |  Otherwise run stats.js.
  |<----------------------------------|
```

### Words you will meet

| Word | Meaning |
|------|---------|
| **Hash** | A one-way scramble. Easy to make from the password, impossible to reverse. We store only this. |
| **Salt** | Random bytes mixed in before hashing, so two people with the same password get different hashes. |
| **PBKDF2** | A hash that repeats itself 100,000 times on purpose, so guessing is slow. |
| **Cookie** | A small piece of text the browser stores and sends back with every request to the same site. |
| **Signature (HMAC)** | Proof the server made the cookie. Made with `SESSION_SECRET`. Change one character and it no longer matches. |
| **HttpOnly** | The page's JavaScript cannot read the cookie, so a malicious script cannot steal it. |
| **SameSite=Strict** | The browser does not send the cookie when another website triggers the request. |
| **Rate limit** | 5 wrong passwords per 15 minutes per IP address, then the server answers "429 Too Many Requests". |
| **Secret / environment variable** | A setting kept outside the code, so it never ends up on GitHub. |

### The new files

```
lib/auth.js                       Hashing, cookies, signatures (read this one first)
functions/api/admin/_middleware.js  Guards every /api/admin/* request
functions/api/admin/login.js        Checks the password, rate limits, sets the cookie
functions/api/admin/logout.js       Deletes the cookie
functions/api/admin/stats.js        Storage used (an example protected endpoint)
functions/admin/_middleware.js      Sends logged-out visitors from /admin pages to /admin/login
public/admin/login.html             Login page
public/admin/index.html             Dashboard with the storage meter
public/js/admin-login.js            Sends the password
public/js/admin.js                  Loads the storage numbers, handles "Log out"
migrations/0002_login_attempts.sql  Table that counts wrong passwords
scripts/hash-password.mjs           Turns your password into a hash
```

---

## Part C: Try it on your Mac

In Terminal, inside the project folder:

1. Get the new code:
   ```
   git pull
   ```
2. Add the new database table:
   ```
   npm run db:migrate:local
   ```
3. Choose your admin password (at least 12 characters; a short phrase is easiest
   to remember). The letters stay hidden while you type, which is normal:
   ```
   npm run hash-password
   ```
   This creates a file called `.dev.vars` with your hash and a random secret. The
   file is in `.gitignore`, so it stays on your Mac.
4. Start the site:
   ```
   npm run dev
   ```
5. Open http://localhost:8788/admin. You land on the login page. Log in to see the
   dashboard. (Storage says 0 B because the sample images are tiny drawings
   without sizes. Real uploads will count.)

### Experiments

1. **Try the lock.** While logged out, open http://localhost:8788/api/admin/stats.
   You get `{"error":"Not logged in"}`. Log in and open it again.
2. **Look at the cookie.** Logged in, open Inspect, then the **Application** tab
   (in Safari: **Storage**), then **Cookies**. You can see `session`, with
   HttpOnly checked.
3. **Trigger the rate limit.** Log out and type a wrong password 6 times.
   Then reset it with:
   ```
   npx wrangler d1 execute portfolio-db --local --command "DELETE FROM login_attempts"
   ```

### Forgot your password?

Run `npm run hash-password` again and restart `npm run dev`. That replaces the
hash and the secret, which also logs out every browser.

---

## Part D: On the live site (when you deploy)

The live site cannot read `.dev.vars`. Store the two values on Cloudflare instead.
`npm run hash-password` prints them for you:

```
npx wrangler pages secret put ADMIN_PASSWORD_HASH
npx wrangler pages secret put SESSION_SECRET
npm run db:migrate:remote
npm run deploy
```

Each `secret put` asks you to paste the value. Secrets are encrypted at Cloudflare
and never appear in your code.

---

## Honest limits

- Logging out deletes the cookie from **your** browser. A copied cookie would keep
  working until it expires (7 days). If you ever think your login leaked, run
  `npm run hash-password` and update the live secrets: a new `SESSION_SECRET`
  instantly invalidates every old cookie.
- The rate limit is per IP address. That stops casual guessing; a long, unique
  password is still your main protection.

## Coming next

**Lesson 3:** creating sets and the upload page. Your browser shrinks each 25 MB
original into a thumbnail and a display version, adds your watermark, and uploads
only those.
