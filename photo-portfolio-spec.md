# Photography Portfolio Website: Project Spec

## Goal
Build a low-cost (target: $0 on free tiers) photography portfolio with two sides:
- Public viewer gallery, organized as sets (albums) of about 25 photos each.
- Private admin area where only the owner logs in, uploads photos, and manages sets.

Originals (about 25 MB each) stay on the owner's local disk and are NEVER uploaded. Only compressed web versions are stored in the cloud, to keep storage small.

## Tech Stack (preferred)
- Hosting: Cloudflare Pages (static frontend) with Pages Functions for the API.
- Image storage: Cloudflare R2 (10 GB free tier).
- Metadata database: Cloudflare D1 (sets, photos, ordering, captions).
- Admin auth: Cloudflare Access (free for small teams) OR a simple single-user login with a hashed password and signed HttpOnly session cookie.
- Frontend: plain HTML/CSS/JS or a light framework (Astro or SvelteKit with static output). Keep dependencies minimal.
- Alternative stack if simpler: Supabase (Auth, Postgres, Storage) with Row Level Security. Note its free storage is smaller (about 1 GB).

## Core Design Decision: Compress in the Browser
Do the image processing client-side in the admin page before upload, so the 25 MB original never leaves the owner's computer and no server-side image processing is needed.

On upload, for each selected photo the admin page generates:
1. Thumbnail: about 500 px on the long edge, JPEG or WebP, quality about 75, target 50 to 100 KB.
2. Display version: about 2000 px on the long edge, JPEG or WebP, quality about 80, target 300 KB to 1 MB.
   - Optionally bake in a semi-transparent watermark (text or logo) using Canvas before export.
3. Only these two files are uploaded to R2. Strip EXIF (or keep only safe fields like camera and lens if desired; remove GPS by default).

Suggested libraries: browser-image-compression, or native Canvas with createImageBitmap, plus pica for high-quality resizing. Process files in a queue (2 to 3 at a time) with a progress bar to avoid freezing the browser on 25 MB files.

## Features

### Public viewer side
- Home page: grid of sets, each with a cover photo, title, and photo count.
- Set page: thumbnail grid (masonry or uniform), lazy loaded (`loading="lazy"`).
- Lightbox viewer: click a thumbnail to open the display version, with keyboard arrows, swipe on mobile, and close button.
- Responsive layout, fast load, accessible (alt text, focus states).
- Basic SEO: page titles, Open Graph image per set.

### Admin side (login required)
- Login page and protected /admin routes.
- Create, rename, reorder, and delete sets.
- Upload photos into a set via drag and drop or file picker (multi-select).
- Client-side compression and watermark preview before upload.
- Reorder photos, set the cover photo, edit title, caption, and alt text.
- Delete photos (removes both R2 objects and the database row).
- Show storage used (sum of file sizes) so the owner can monitor free-tier limits.

## Download Deterrence (be honest about limits)
Preventing saving is not fully possible; the strategy is to make saved copies low value.
- Public site serves only the watermarked, 2000 px version. No originals exist online.
- No visible download button.
- Block right-click and drag on gallery images (casual deterrent only).
- Serve R2 images through a Worker or custom domain with hotlink protection (check the Referer header).
- Optional: short-lived signed URLs for image requests.
- Do not claim to the owner that this is theft-proof.

## Data Model (D1)
- sets: id, slug, title, description, cover_photo_id, sort_order, created_at
- photos: id, set_id, thumb_key, display_key, width, height, caption, alt_text, sort_order, size_bytes, created_at

## API Endpoints (Pages Functions)
Public (read only):
- GET /api/sets
- GET /api/sets/:slug (set with its photos)
- GET /img/:key (optional proxy with hotlink check and cache headers)

Admin (authenticated):
- POST /api/admin/login, POST /api/admin/logout
- POST /api/admin/sets, PATCH /api/admin/sets/:id, DELETE /api/admin/sets/:id
- POST /api/admin/photos/upload-url (returns a presigned or direct upload path for R2)
- POST /api/admin/photos (register uploaded photo metadata)
- PATCH /api/admin/photos/:id, DELETE /api/admin/photos/:id
- PATCH /api/admin/sets/:id/reorder

## Security Requirements
- All admin routes and write endpoints require auth; verify on the server, never only in the UI.
- Rate limit login attempts; use HttpOnly, Secure, SameSite cookies.
- Validate file type and size on the server (accept only JPEG, PNG, WebP; max processed size about 5 MB).
- Never expose R2 write credentials to the browser; use server-issued, short-lived upload URLs or upload through the Function.
- Keep secrets in Cloudflare environment variables, not in the repo.

## Performance and Cost Targets
- Per set of 25 photos: about 15 to 25 MB total stored.
- Home page under 1 MB of images on first load; lazy load everything else.
- Set cache headers on images (long max-age, immutable) since keys are unique.
- Stay within free tiers; show a storage usage readout in admin.

## Suggested Build Order
1. Scaffold project, repo, and Cloudflare Pages deployment with a placeholder page.
2. Set up R2 bucket and D1 database; create schema and migrations.
3. Build public API and gallery pages with seed data.
4. Implement admin auth and protected routes.
5. Build upload flow: client-side resize, compression, watermark, then upload and register metadata.
6. Add set and photo management (reorder, cover, captions, delete).
7. Add lightbox, lazy loading, and responsive polish.
8. Add hotlink protection, caching, and security hardening.
9. Write a short README covering setup, environment variables, and deployment.

## Out of Scope (for now)
- Selling prints or digital downloads
- Client proofing or private per-client galleries
- Comments, likes, or user accounts for viewers

## Notes for Claude Code
- Ask before adding any paid service or heavy dependency.
- Prefer simple, readable code over clever abstractions.
- Test the upload flow with 25 MB JPEGs to confirm the browser stays responsive and outputs land in the target size ranges.
