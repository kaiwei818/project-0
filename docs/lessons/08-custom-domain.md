# Lesson 8: Moving to your own domain

Use this when you buy a domain like `winstonlens.com`. Good news first: **no code
changes are needed.** The site builds every address (link previews, sitemap,
images) from whatever domain a visitor uses, so it works on a new domain as soon
as Cloudflare points the domain at it.

Your photos, sets, and settings stay exactly where they are. A domain is only a
new name for the same site.

---

## Step 1: Buy the domain (in Cloudflare is easiest)

1. In the Cloudflare dashboard, open **Domain Registration**, then
   **Register Domains**.
2. Search for the name, for example `winstonlens.com`, and buy it. Cloudflare
   sells domains at cost, around US$10 a year for `.com`, with no markup.

Buying it in Cloudflare means the next step is automatic. (If you buy it
elsewhere, Cloudflare will show you two "nameserver" addresses to enter at the
other company; it takes a few hours to take effect.)

## Step 2: Connect it to your site

1. In the dashboard, open **Workers & Pages**, then your project **winstonlens**.
2. Open the **Custom domains** tab and click **Set up a custom domain**.
3. Type `winstonlens.com` and confirm. Cloudflare creates the settings and the
   HTTPS certificate by itself. It usually takes a few minutes.
4. Do the same again for `www.winstonlens.com`, so both spellings work.

Open `https://winstonlens.com` to check. The old address
`https://winstonlens.pages.dev` keeps working too.

## Step 3: Log in again

Login cookies belong to one domain, so open `https://winstonlens.com/admin` and
log in once on the new address. Same password.

## Step 4: Tell Google

1. In Google Search Console (https://search.google.com/search-console), click
   **Add property** and enter `https://winstonlens.com`.
2. Follow the steps to verify it. Choose the **DNS** method: because the domain
   is in Cloudflare, Google can often add the record for you, or you paste one
   line in Cloudflare under your domain, **DNS**, then **Records**.
3. Submit `https://winstonlens.com/sitemap.xml`.

## Step 5 (optional): One main address

Right now, three addresses show the same site. Google prefers one. To send
everyone to `https://winstonlens.com`:

1. In the dashboard, open your domain `winstonlens.com`, then **Rules**, then
   **Redirect Rules**, and click **Create rule**.
2. Choose the template **Redirect from WWW to root**, and save.

For `winstonlens.pages.dev` you can leave it, or ask me to add a small redirect in
the code so visitors there are moved to the new domain automatically.

## Step 6: Update your links

Change the address in your Instagram bio, business cards, and email signature.

---

## When do I need ALLOWED_HOSTS?

Almost never. Hotlink protection allows images on a page from the **same**
address, and each domain loads its own images. You would only need
`ALLOWED_HOSTS` (in `wrangler.toml`) if pages on one domain showed images from a
different domain.
