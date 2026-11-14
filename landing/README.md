# Undistracted Me — Landing Page

An **Astro** marketing site for the **Undistracted Me** browser extension. SEO-first,
static output, with a small client-side script for the masonry layout, scroll
reveals, browser detection, and the live Focus Mode clock.

- **Marketing site:** `https://undistracted.me` and `https://www.undistracted.me`
- **Web app:** `https://app.undistracted.me`
- **Backend API:** `https://api.undistracted.me`
- **Privacy & Terms:** `https://undistracted.me/pp-and-tos`

## Stack

- **Astro** (static output) — `@astrojs/sitemap` + `@jdevalk/astro-seo-graph` for build-time SEO validation.
- Plain CSS design system (hex tokens, fixed light design with dark sections), no UI framework.
- Product screenshots (PNG) optimized to WebP, plus photos extracted from the reference design.

## Files

```
landing/
├── astro.config.mjs       site config + sitemap + SEO integration
├── package.json           astro, @astrojs/sitemap, @jdevalk/astro-seo-graph
├── src/
│   ├── pages/
│   │   ├── index.astro        the landing page + client-side JS
│   │   └── robots.txt.ts      robots.txt + sitemap ref
│   ├── layouts/BaseLayout.astro   <head> (Seo component, fonts)
│   ├── components/           Header, Hero, Why, Marquee, Story, Features,
│   │                         Themes, Focus, Privacy, Faq, Install, Support,
│   │                         Close, Footer, Sprite (icon symbol sprite)
│   ├── data/                 site constants, widgets catalog, FAQ, JSON-LD schema
│   ├── assets/
│   │   ├── design/           photos extracted from the reference HTML (WebP)
│   │   ├── photos/           LookAway / Sync feature photos (WebP)
│   │   └── screenshots/      product screenshots captured from the app (WebP)
│   └── styles/global.css     design system
└── public/
    ├── favicon.png, logo.svg
    ├── textures/            grain-cream / grain-white / momo (CSS backgrounds)
    ├── og.jpg               Open Graph share image (1200×630)
    └── pp-and-tos.html      Privacy Policy & Terms (self-contained)
```

## Run locally

```bash
cd landing
npm install
npm run dev      # → http://localhost:4321
npm run build    # static build → dist/
npm run preview  # serve the build
```

## SEO

The build ships and validates, via `@jdevalk/astro-seo-graph`, at every build:

- `title` / `description` / canonical / Open Graph / Twitter / `robots` meta
- JSON-LD `@graph`: `Organization`, `WebSite`, `SoftwareApplication` (with install offers), `WebPage`, `FAQPage`
- `sitemap-index.xml` (`@astrojs/sitemap`) + `robots.txt` (with `Content-Signal:`)
- `llms.txt` for LLM/agent discovery
- H1 / image-alt / metadata-length / duplicate-metadata / internal-link validation

## Deploy

The build outputs plain static files to `dist/` — deploy them to any static host
(Cloudflare Pages, Netlify, GitHub Pages, S3 + CDN, …). There are no server functions
or runtime dependencies.

### DNS records (at Cloudflare)

| Type | Name | Value |
|---|---|---|
| A | `@` (apex) | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `app` | `cname.vercel-dns.com` |

> Update the `www` / apex records to point at your chosen host once Vercel is removed.

## Links

| Destination | URL |
|---|---|
| Chrome Web Store | `https://chromewebstore.google.com/detail/undistracted-me/dfgbijakkhepoonhaelocdmcleeehmef` |
| Firefox Add-ons | `https://addons.mozilla.org/en-US/firefox/addon/undistracted-me/` |
| GitHub | `https://github.com/sarojbelbase/undistracted-me` |
| Privacy & Terms | `https://undistracted.me/pp-and-tos` |
| Feedback form | `https://forms.gle/7vf4VGrB9Loz8hB76` |

## Design system (summary)

The reference design (single HTML page) is the source of truth; the tokens and
content rules are recorded in `artifacts/docs/DESIGN.md`.

- **Style:** "unplug the noise" — a calm paper-and-ink single page with pinned
  scroll sections (the "why" and the four-step "story"), a notification ticker,
  and a masonry widget gallery with a tooltip on hover.
- **Colors:** cream `#f4f1ec` / white `#f7f7f7` / near-black `#0b0b0b` /
  muted `#6a6964` / sun `#f6b414` (the only accent) / red `#d92d20` (badges).
- **Type (5 voices):** `Bricolage Grotesque` (titles/head), `Hanken Grotesk`
  (body/UI), `Bebas Neue` (labels/caps), `DM Mono` (numbering/meta),
  `Fraunces` italic (storytelling only), via Google Fonts.
- **Modes:** light design with hardcoded dark sections (Focus, Privacy, footer)
  — no manual toggle.
- **Motion:** scroll-scrubbed reveals, staggered entrances, and a live Focus
  Mode clock, all disabled under `prefers-reduced-motion`.
