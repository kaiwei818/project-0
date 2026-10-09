# Photography Portfolio

A low-cost photography portfolio on Cloudflare's free tier: a public gallery of
photo sets, plus a private admin area at `/admin` for creating sets and uploading photos.
The full plan is in [photo-portfolio-spec.md](photo-portfolio-spec.md).

## Learning guide

1. [Lesson 1: How the site works, and running it on your Mac](docs/lessons/01-setup-and-gallery.md)
2. [Lesson 2: The admin login](docs/lessons/02-admin-login.md)
3. [Lesson 3: Creating sets and uploading photos](docs/lessons/03-uploads.md)

## Quick start

```
npm install
npm run seed:local   # sample sets in a local database (no account needed)
npm run hash-password  # choose your admin password (saved to .dev.vars)
npm run dev          # open http://localhost:8788
```

## Progress (spec build order)

- [x] 1. Scaffold project and Cloudflare Pages config
- [x] 2. D1 schema and migrations; R2 binding
- [x] 3. Public API and gallery pages with seed data
- [x] 4. Admin auth and protected routes
- [x] 5. Upload flow (client-side resize, compression, watermark)
- [ ] 6. Set and photo management
- [ ] 7. Lightbox and responsive polish
- [ ] 8. Hotlink protection, caching, security hardening
- [ ] 9. Final setup and deployment docs

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Run the site locally |
| `npm run seed:local` | Reset local data to the sample sets |
| `npm run hash-password` | Set the admin password |
| `npm run db:migrate:local` | Apply database migrations locally |
| `npm run db:migrate:remote` | Apply database migrations to Cloudflare |
| `npm run deploy` | Publish to Cloudflare Pages |
