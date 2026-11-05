# DESIGN.md — Undistracted Me (landing page)

## Context (from discovery)

- Artifact type: marketing / landing page
- Positioning: creative / editorial (a calm, privacy-first utility with a regional identity)
- Audience: people who want a quieter new tab — students, writers, engineers; Nepal-first with global reach
- Primary action: install the extension (Chrome, then Firefox)
- Adjectives: calm, rooted, precise, warm, quiet
- Aesthetic essence (3 words): still, alpine, clarity
- Single-minded proposition: a new tab that reads like a quiet Himalayan morning, not another app.
- Archetype: Sage
- Mode: light + dark | Density: airy
- Constraints: Astro (static output) for SEO; preserve all original copy, URLs, analytics, and privacy content; WCAG 2.2 AA; dark-mode toggle persisted.

## Aesthetic

- Direction: bespoke — "Himal" (Himalayan editorial). Editorial scaffold (hairline rules, asymmetric grid, serif display) warmed with a natural parchment/pine/saffron palette.
- Defining trait: rules-and-columns replace the card grid. Sections are divided by hairlines; features are an editorial index, not icon-tile cards.
- Signature move: **Ridgeline** — a thin Himalayan skyline drawn as a hairline SVG that divides major sections, underlines the active nav link, and caps the footer. The accent marks a single "summit" (active state).

## Typography

- Three voices (addresses "one font everywhere"):
  - Display: **Newsreader** (variable serif, opsz + ital) — headlines, section titles, FAQ questions
  - Body: **Work Sans** (variable) — paragraphs, buttons, nav
  - Mono: **IBM Plex Mono** — kickers/overlines, labels, dates, numerals, meta (hero notes, captions, footer)
- Source: Google Fonts | license: OFL
- Scale: ratio 1.25 (Major Third), base 16px

  | step | size (fluid) | line-height | use |
  |------|--------------|-------------|-----|
  | display | clamp(2.9rem, 7vw, 5.5rem) | 0.98 | hero |
  | h2 | clamp(1.9rem, 2.6rem + 1.4vw, 3rem) | 1.06 | section title |
  | h3 | 1.28rem | 1.3 | feature title |
  | body | 1rem | 1.6 | text |
  | small | 0.875rem | 1.55 | meta, captions |
  | overline | 0.72rem (mono) | 1.4 | kicker, letter-spacing 0.14em, uppercase |

- Weights: display 400–500 (italic em = 400); body 400/500/600; mono 400/500. Tracking: display -0.015em (no tighter); overlines +0.14em.

## Color

- Strategy: warm natural palette anchored to Nepal identity. Pine (brand) + saffron/marigold (accent) sit far outside the indigo/violet default.
- Distribution: 60 neutral (parchment/ink) / 30 brand (pine) / 10 accent (saffron)
- Palette (role → OKLCH | hex):
  - bg: oklch(0.96 0.018 92) | #f6efe3 (warm parchment)
  - surface: oklch(0.985 0.008 92) | #fcf8ef
  - fg: oklch(0.26 0.022 165) | #1d2b26 (deep pine ink)
  - muted: oklch(0.50 0.02 165) | #57655f
  - faint: oklch(0.52 0.017 158) | #626d66
  - border: oklch(0.85 0.016 92) | #d9d0bf
  - brand: oklch(0.44 0.06 165) | #2f5a4b (Himalayan pine)
  - accent: oklch(0.64 0.15 62) | #bd6f1e (saffron/marigold)
  - success / warning / error: #1f6b4a / #c88a1e / #bd3a28
  - dark panel bg: #16231e | dark panel fg: #efe8db
- Dark mode overrides: bg #121b17; surface #18231e; fg #efe8db; accent #d9a45a (lighter desaturated marigold).

## Spacing, radius, shadow

- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128
- Radius: two values — `--radius: 4px` (surfaces, buttons, frames) and `--radius-pill: 999px` (small inline tags only)
- Shadow approach: **defined edge** — hairline borders/rules carry structure. One soft shadow reserved for the two floating product screenshots (hero, focus), never stacked with a hairline border on the same element.

## Layout and composition

- Grid: 12-column editorial, max content 1180px, asymmetric gutter
- Spacing rhythm: tight within a group (8–16px), generous between groups (48–64px), large between sections (96–128px)
- Signature layout move: asymmetric split hero — left-aligned serif headline on parchment, product screenshot overlapping a framed misty-mountain photo on the right.
- Sections (in order): Hero → Features (editorial index) → Themes (Paper/Glass/Comic + auto day/night) → Time & Calendar (dual timezone + Nepali date) → Focus & Sound (dark spotlight) → Privacy → FAQ → CTA band → Footer.
- Density: airy | Scanning: Z (hero) then F (content)

## Components and states

- Button hierarchy: one primary (ink filled) per view; secondary (outlined); tertiary (text link with arrow). States: hover (bg/tint + arrow nudge), active (scale 0.98), focus (2px saffron box-shadow ring), disabled (muted + no shadow).
- Browser icons: inline **bootstrap-icons** `browser-chrome` / `browser-firefox` (filled, `currentColor`) — no nudge on hover.
- Nav: plain text links; hover = hairline underline; active = ridgeline underline with a saffron summit tick.
- FAQ: native `<details>`/`<summary>`, chevron rotates 180deg, single-open accordion.
- Focus ring: box-shadow `0 0 0 2px var(--paper), 0 0 0 4px var(--accent)`.

## Motion

- Duration scale: 150ms / 200ms / 300ms; ease-out cubic-bezier(0.23, 1, 0.32, 1).
- What animates: transform and opacity only; reduced-motion gated behind `prefers-reduced-motion: reduce`.

## Iconography

- Functional icons (sun/moon, menu/close, arrow, check, chevron): inline 24px grid, 1.75px stroke, round caps/joins. Browser brand glyphs (Chrome/Firefox) are filled, `currentColor`.

## Imagery and illustration

- Real product screenshots (captured via Playwright from the live app) + one misty-mountain photograph.
- Screenshots: dashboard in Paper/Glass/Comic/Dark, Focus Mode (+ rain), dual-timezone clock, Nepali date — optimized to WebP, served via Astro `<Image>` (responsive srcset).
- Rules: photo warm-graded toward the palette; product screenshots framed with a hairline border; no stock/AI/Corporate-Memphis.

## Dark mode

- Base bg oklch L 0.20 (near-black pine); fg off-white oklch(0.94); elevation via lightness; accent lighter + desaturated; theme swap suppresses transitions.

## Accessibility

- Contrast: AA verified both modes | Focus: visible 2px managed ring
- Keyboard: fully operable, skip link, Escape closes menu | Targets: >= 44px
- Color independence: yes | Reduced motion: yes | aria-expanded/aria-current/semantic headings

## SEO (Astro)

- `site:` set to production origin; canonical derived from site config.
- Single `<Seo>` component (from `@jdevalk/astro-seo-graph`) emitting title, description, canonical, Open Graph (1200×630 `og.jpg`), Twitter, `robots` (max-snippet/-image-preview/-video-preview).
- JSON-LD `@graph`: Organization, WebSite, SoftwareApplication (install offers), WebPage, FAQPage.
- `@astrojs/sitemap` → `sitemap-index.xml`; `robots.txt` with `Sitemap:` + `Content-Signal:`; `llms.txt` for agent discovery.
- Build-time validation via `seoGraph()`: H1 count, image alt, metadata length, duplicate metadata, internal links.
- Performance: static output, Astro `<Image>` (responsive WebP + lazy), hero photo preloaded, hashed assets under `/_astro/` with immutable cache.

## Slop audit

- Date: 2026-11-05 (v2 — Astro rebuild) | Result: pass
- Notes: removed the Devanagari Bikram Sambat accent from the hero (Nepali calendar remains a showcased feature, not a decorative flourish); added Chrome/Firefox brand icons; switched from the 2-family Fraunces + Schibsted Grotesk to a 3-voice Newsreader + Work Sans + IBM Plex Mono (fixes "one font everywhere"); added Themes, Time & Calendar, and Focus & Sound spotlights with fresh Playwright screenshots; removed the "Try it in the browser" web-app section. Migrated from plain static HTML to Astro for SEO (sitemap, JSON-LD, validation, OG image).

## Changelog

- 2026-11-05 (v1): full redesign to "Himal" Himalayan editorial; OKLCH tokens; Ridgeline signature.
- 2026-11-05 (v2): Astro rebuild; 3-voice type system; browser icons; Themes/Time/Focus spotlights; fresh screenshots; full SEO stack; removed Bikram Sambat hero accent and web-app section.
