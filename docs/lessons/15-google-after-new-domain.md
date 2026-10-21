# Lesson 15: Getting winstonlens.com into Google

Do these steps **after** deploying this lesson's code. Total time: about 20
minutes, then Google needs a few days to a few weeks.

## What the code now does for Google

| What | Why |
|------|-----|
| `winstonlens.pages.dev` and `www.winstonlens.com` send visitors to `winstonlens.com` with a permanent (301) redirect, keeping the rest of the address | Google moves your pages and their ranking to the new name, and never shows two copies |
| The test copy of each deploy (`2f1d6431.winstonlens.pages.dev`) tells Google "do not index" | Only the real address appears in search |
| Structured data (schema.org) on the home page and every set | Google understands "a photo gallery by Winston Chang", and Google Images can show your name as the credit, plus a "Licensable" label that links to your About page |
| The sitemap lists every photo of every set | Your photos can appear in Google Images (the watermarked versions, never the clean copies) |

The main address is in `lib/site.js` (`domain`), and the old ones in `oldHosts`.

## Step 1: Add the new domain to Search Console

1. Open https://search.google.com/search-console and click the property menu
   (top left), then **Add property**.
2. Choose **Domain** (the left box) and type `winstonlens.com`. A Domain
   property covers every version: with and without www, http and https.
3. Google shows a **TXT record** to prove you own the domain. Often there is a
   button to **Verify with Cloudflare**: click it, log in, and allow it.
   Otherwise copy the value, then in Cloudflare open your domain, **DNS**,
   **Records**, **Add record**: Type `TXT`, Name `@`, Content: the value
   Google gave you. Save.
4. Back in Search Console, click **Verify**. If it fails, wait 10 minutes and
   try again.

## Step 2: Submit the sitemap

In the new property, open **Sitemaps**, enter `sitemap.xml`
(so it reads `https://winstonlens.com/sitemap.xml`), and click **Submit**.
After a few minutes the status should say **Success**, with the number of pages.

## Step 3: Ask Google to visit your main pages now

1. In the search bar at the top, paste `https://winstonlens.com/`.
2. When the result appears, click **Request indexing**.
3. Do the same for the About page and your two or three best sets. (Google
   allows about 10 requests a day; the sitemap covers the rest by itself.)

## Step 4: Tell Google you moved (Change of address)

This moves what Google already knew about `winstonlens.pages.dev` to the new domain.

1. Switch to your **old** property, `https://winstonlens.pages.dev/` (it stays
   verified by the tag in `index.html`; do not remove that line).
2. Open **Settings** (bottom left), then **Change of address**.
3. Choose `winstonlens.com` as the new site, and click **Validate & update**.
   Google checks that the old pages redirect (the code does this). If it lists
   problems, send me a screenshot.

## Step 5: Check the structured data

Open https://search.google.com/test/rich-results, paste one of your set
addresses, and click **Test URL**. It should find **Image metadata** with no
errors. (Warnings about optional fields are fine.)

## Step 6: Bing, DuckDuckGo, and ChatGPT search

Bing's index also feeds DuckDuckGo, Yahoo, and ChatGPT search.

1. Open https://www.bing.com/webmasters and sign in.
2. Choose **Import from Google Search Console** and allow it. Your site and
   sitemap are copied over; nothing else to do.

## Step 7: Update your links

Instagram bio, other social profiles, business cards, email signature, and
anywhere you shared the old address. Old links still work (they redirect),
but links that point straight to the new address help Google the most.

## What to expect

| When | What you see |
|------|--------------|
| Same day | Sitemap "Success"; URL inspection says "URL is on Google" for pages you requested, or "Discovered" |
| 1 to 2 weeks | Most pages listed under **Indexing, Pages** as indexed |
| Weeks to months | Search results and Google Images traffic grow, especially for searches with your name or the places in your set titles |

**Help Google with good text.** Search engines read words, not pictures. A
clear set title ("Kyoto in cherry blossom season" rather than "Trip 3"), a
short description, the Location box, and the photo descriptions (alt text) on
each photo's card in the admin area do more for search than anything else.

## Things that are normal

- "Page with redirect" for `winstonlens.pages.dev` pages: correct, they now redirect.
- "Excluded by noindex" for `xxxx.winstonlens.pages.dev` addresses: correct, those are test copies.
- "Blocked by robots.txt" for `/admin` and `/api/`: correct, those are private.
