# Undistracted Me — Landing Page

A self-contained static marketing site for the **Undistracted Me** browser extension.

- **Marketing site:** `https://undistracted.me` and `https://www.undistracted.me`
- **Web app / API:** `https://app.undistracted.me`
- **Privacy & Terms:** `https://app.undistracted.me/pp-and-tos`

## Files

```
landing/
├── index.html      Semantic, accessible single page
├── styles.css      Design system (light + dark mode, CSS variables, responsive)
├── app.js          Mobile nav, theme toggle, scroll reveal, FAQ accordion
├── vercel.json     Standalone Vercel config (static site, security headers)
├── assets/         Logo, favicon, and product screenshots
├── .gitignore      Ignores the local `.vercel/` project link
└── README.md       This file
```

## Run locally

Open `landing/index.html` in a browser, or serve the folder:

```bash
cd landing
python3 -m http.server 8080
# → http://localhost:8080
```

There is no build step — it's plain HTML, CSS, and JS.

## Deploy to `www.undistracted.me` (Vercel)

The marketing site is a **separate** Vercel project from the web app (which lives at
`app.undistracted.me`). This landing folder is plain static HTML/CSS/JS with its own
`vercel.json` (no build step).

### Current setup

| Piece | Value |
|---|---|
| Vercel project | `undistracted-me-landing` (org: `saroj-belbases-projects`) |
| Production URL | `https://undistracted-me-landing.vercel.app` |
| Domains → landing | `undistracted.me` + `www.undistracted.me` |
| Domain → app | `app.undistracted.me` (existing `undistracted-me` project) |

Deploy from this folder:

```bash
cd landing
vercel deploy --prod
```

To make future pushes auto-deploy, connect the repo in the Vercel dashboard and set the
project's **Root Directory** to `landing` (Framework Preset: *Other*).

### DNS records required (at Cloudflare)

The domain uses Cloudflare nameservers, so these records must be added in the Cloudflare
dashboard. Until they're set, the custom domains won't resolve / SSL won't issue:

| Type | Name | Value |
|---|---|---|
| A | `@` (apex) | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `app` | `cname.vercel-dns.com` |

After the DNS records propagate, Vercel auto-issues the SSL certs and the aliases
(`undistracted.me`, `www.undistracted.me`) complete.

## Links

| Destination | URL |
|---|---|
| Chrome Web Store | `https://chromewebstore.google.com/detail/undistracted-me/dfgbijakkhepoonhaelocdmcleeehmef` |
| Firefox Add-ons | `https://addons.mozilla.org/en-US/firefox/addon/undistracted-me/` |
| GitHub | `https://github.com/sarojbelbase/undistracted-me` |
| Privacy & Terms | `https://app.undistracted.me/pp-and-tos` |

## Feedback form

The landing page links to the project's Google Feedback form:

```
https://forms.gle/7vf4VGrB9Loz8hB76
```

This URL is used for both "Report a bug" and "Suggest a feature" in `index.html`
(footer and FAQ). If a separate feature-request form is created later, update the
two links in `index.html` accordingly.

## Brand / assets

- `assets/logo.svg` — the lotus + wordmark (copied from `src/assets/img/logo.svg`).
  The rendered wordmark in the header/footer is inlined so it adapts to light/dark.
- `assets/favicon.png` — lotus icon (copied from `public/favicon/lotus512.png`).
- `assets/*.png` — product screenshots (copied from `public/showcase/`).

## Design system (summary)

- **Style:** minimal, calm, generous whitespace, micro-interactions, mobile-first.
- **Colors:** teal primary `#0D9488`, orange action `#EA580C`, light teal background.
- **Type:** `Lora` (headings) + `Raleway` (body), via Google Fonts.
- **Modes:** light/dark via `prefers-color-scheme` + a manual toggle (persisted).
