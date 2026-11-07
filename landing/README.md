# Undistracted Me — Landing Page

An **Astro** marketing site for the **Undistracted Me** browser extension. SEO-first,
static output, zero client-side JS beyond a tiny theme/nav script.

- **Marketing site:** `https://undistracted.me` and `https://www.undistracted.me`
- **Web app:** `https://app.undistracted.me`
- **Backend API:** `https://api.undistracted.me`
- **Privacy & Terms:** `https://undistracted.me/pp-and-tos`

## Stack

- **Astro** (static output) — `@astrojs/sitemap` + `@jdevalk/astro-seo-graph` for build-time SEO validation.
- Plain CSS design system (OKLCH tokens, light + dark), no UI framework.
- Fresh product screenshots captured with Playwright from the live app, optimized to WebP.

## Files

```
landing/
├── astro.config.mjs       site config + sitemap + SEO integration
├── package.json           astro, @astrojs/sitemap, @jdevalk/astro-seo-graph
├── src/
│   ├── pages/
│   │   ├── index.astro        the landing page
│   │   └── robots.txt.ts      robots.txt + Content-Signals + sitemap ref
│   ├── layouts/BaseLayout.astro   <head> (Seo component, fonts)
│   ├── components/           Header, Hero, Features, Themes, TimeCalendar,
│   │                         FocusSound, Privacy, Faq, Cta, Footer, Wordmark,
│   │                         BrowserIcon
│   ├── data/                 site constants, FAQ, JSON-LD schema builder
│   ├── assets/showcase/      product screenshots (WebP)
│   └── styles/global.css     design system
└── public/
    ├── favicon.png, logo.svg
    ├── hero-{960,1600,2560}.webp   hero photography
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

The full system lives in [`../DESIGN.md`](../DESIGN.md) — the single source of truth.

- **Style:** "Himal" — Himalayan editorial. Rules-and-columns replace the card grid; one saffron accent used sparingly.
- **Signature move:** a thin Himalayan ridgeline (inline SVG) dividing sections, underlining the active nav link, and capping the footer.
- **Colors:** parchment `#f6efe3` / pine ink `#1d2b26` / Himalayan pine `#2f5a4b` / saffron `#bd6f1e` (authored in OKLCH).
- **Type (3 voices):** `Newsreader` (display serif) + `Work Sans` (body) + `IBM Plex Mono` (kickers, labels, dates, numerals), via Google Fonts.
- **Modes:** light/dark via `prefers-color-scheme` + a manual toggle (persisted).
- **Hero photography:** misty Himalayan range, warm-graded, responsive WebP.
