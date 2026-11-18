# Mischief Marketing — website

The website for [mischiefmarketing.co.nz](https://mischiefmarketing.co.nz): a fast, static
[Jekyll](https://jekyllrb.com) site, set up to be edited and hosted on
[CloudCannon](https://cloudcannon.com) straight from this GitHub repository.

- **No frameworks, no build tools beyond Jekyll.** One CSS file, two small vanilla JS files.
- **Responsive** desktop → tablet → mobile, with a full-screen mobile menu.
- **The "wow" hero:** the raccoon logo is rebuilt from ~2,000 particles that fly in and
  assemble, scatter away from your cursor (or finger), and explode when you click/tap it.
  It pauses when off-screen, scales particle count to the device, and falls back to the
  static logo if JavaScript is off or the visitor prefers reduced motion.

---

## Put it on CloudCannon

1. Push this repository to GitHub.
2. In CloudCannon: **Add new site → GitHub → pick this repository / `main` branch**.
3. CloudCannon detects Jekyll automatically. If it asks for build settings, use:
   - **SSG:** Jekyll
   - **Build command:** `bundle exec jekyll build`
   - **Output path:** `_site`
4. When the first build finishes, point the domain at CloudCannon:
   **Site Settings → Domain** → add `mischiefmarketing.co.nz` and follow the DNS steps.

Every push to `main` rebuilds the site; every edit made in CloudCannon is committed back
to GitHub.

### Contact form

The form posts to CloudCannon's built-in form handling and redirects to `/thank-you/`.
Submissions are emailed to `form_recipient` in `_data/site.yml`.
In CloudCannon, check **Site Settings → Forms** (or "Inboxes") and confirm the address
there so messages are delivered. A hidden honeypot field (`_gotcha`) helps block spam.

---

## Editing content

| What | Where |
|---|---|
| Email, Instagram, location, nav links, marquee words, form options | `_data/site.yml` (CloudCannon: **Data → Site**) |
| Homepage text (hero, rotating words, stats, services, CTA) | front matter at the top of `index.html` |
| About / Services / Process | `about.html`, `services.html`, `process.html` |
| Service detail pages | `website-design.html`, `social-media-management.html` (share `_layouts/service.html`) |
| Thank-you & 404 pages | `thank-you.html`, `404.html` |

All page copy lives in each page's **front matter**, so in CloudCannon it shows up as
simple labelled fields — no HTML needed.

## Structure

```
_config.yml              Jekyll settings
cloudcannon.config.yml   CloudCannon editor settings
_data/site.yml           global business details
_layouts/                default + service page layouts
_includes/               head, nav, footer, hero, CTA, contact form, marquee
assets/css/main.css      all styles (palette + type tokens at the top)
assets/js/main.js        nav, scroll reveals, word rotator, hover effects, timeline
assets/js/hero.js        the particle raccoon (homepage only)
assets/img/              logos (transparent PNG/WebP), social share image
```

## Run locally (optional)

Requires Ruby 3.x:

```bash
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000.
