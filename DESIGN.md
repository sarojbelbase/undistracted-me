# DESIGN.md — Undistracted Me (landing page)

## Context (from discovery)

- Artifact type: marketing / landing page
- Positioning: creative / editorial (a calm, privacy-first utility with a regional identity)
- Audience: people who want a quieter new tab — students, writers, engineers; Nepal-first with global reach
- Primary action: install the extension (Chrome, then Firefox)
- Adjectives: calm, rooted, precise, warm, quiet
- Visual word translations:
  - calm -> generous whitespace, low-chroma palette, no motion noise
  - rooted -> Nepali/Himalayan identity: pine, saffron, mountain ridgeline, Bikram Sambat date
  - precise -> strict editorial grid, hairline rules, tabular numerics, consistent stroke icons
  - warm -> warm parchment paper + warm off-ink, a serif display with character
  - quiet -> one accent color used sparingly, rules instead of card noise
- Aesthetic essence (3 words): still, alpine, clarity
- Single-minded proposition: a new tab that reads like a quiet Himalayan morning, not another app.
- Archetype: Sage
- References: admire — editorial broadsheet typography (rules-and-columns replacing cards), Stripe's calm single-accent restraint, Apple's product-as-hero. avoid — the 2022-2026 AI-default landing (cream + Instrument Serif hero, floating pill nav, icon-tile feature cards).
- Mode: light + dark | Density: airy
- Constraints: plain static HTML/CSS/JS (no build step); must preserve all existing copy, URLs, and analytics; WCAG 2.2 AA; dark mode toggle persisted.

## Aesthetic

- Direction: bespoke — "Himal" (Himalayan editorial). Editorial scaffold (hairline rules, asymmetric grid, serif display) warmed with a natural parchment/pine/saffron palette.
- Defining trait: rules-and-columns replace the card grid. Sections are divided by hairlines; features are an editorial index, not icon-tile cards.
- Signature move: **Ridgeline** — a thin Himalayan skyline drawn as a hairline SVG that divides major sections, underlines the active nav link, and caps the footer. The accent marks a single "summit" (active state). A quiet Bikram Sambat year (२०८३) sits in the hero as a Devanagari date accent.

## Typography

- Display: Fraunces (variable, opsz + SOFT/WONK) | source: Google Fonts | license: OFL
- Body: Schibsted Grotesk (variable) | source: Google Fonts | license: OFL
- Devanagari accent: system stack ("Kohinoor Devanagari", "Nirmala UI", "Noto Sans Devanagari"), no webfont download
- Scale: ratio 1.25 (Major Third), base 16px

  | step | size (fluid) | line-height | use |
  |------|--------------|-------------|-----|
  | display | clamp(2.9rem, 7vw, 5.9rem) | 0.98 | hero |
  | h1 | clamp(2rem, 5vw, 4rem) | 1.04 | page title |
  | h2 | clamp(1.9rem, 2.6rem + 1.4vw, 3.1rem) | 1.08 | section title |
  | h3 | 1.125rem | 1.3 | subsection / feature title |
  | body | 1rem | 1.65 | text |
  | small | 0.875rem | 1.55 | meta, captions |
  | overline | 0.75rem | 1.4 | kicker, letter-spacing 0.14em, uppercase |

- Weights: 400 / 500 / 600 (display uses 500-600 with opsz tuned); Measure: 60-70ch; Tracking: display -0.015em (no tighter); overlines +0.14em.

## Color

- Strategy: warm natural palette anchored to the product's Nepal identity. Pine (brand) + saffron/marigold (accent) sit far outside the indigo/violet default. Neutrals are warm parchment, not gray.
- Distribution: 60 neutral (parchment/ink) / 30 brand (pine) / 10 accent (saffron)
- Palette (role -> OKLCH | hex):
  - bg: oklch(0.96 0.018 92) | #f6efe3 (warm parchment)
  - surface: oklch(0.985 0.008 92) | #fcf8ef
  - fg: oklch(0.26 0.022 165) | #1d2b26 (deep pine ink)
  - muted: oklch(0.50 0.02 165) | #57655f
  - faint: oklch(0.52 0.017 158) | #626d66
  - border: oklch(0.85 0.016 92) | #d9d0bf
  - brand: oklch(0.44 0.06 165) | #2f5a4b (Himalayan pine)
  - accent: oklch(0.64 0.15 62) | #bd6f1e (saffron/marigold)
  - accent-fg: oklch(0.985 0.008 92) | #fcf8ef
  - success: oklch(0.48 0.10 165) | #1f6b4a
  - warning: oklch(0.66 0.15 75) | #c88a1e
  - error: oklch(0.53 0.19 28) | #bd3a28 (tika red)
  - dark panel bg: oklch(0.25 0.02 165) | #16231e
  - dark panel fg: oklch(0.94 0.008 92) | #efe8db
- Dark mode overrides: bg oklch(0.20 0.012 165) | #121b17; surface oklch(0.24 0.014 165); fg oklch(0.94 0.008 92); muted oklch(0.72 0.015 165); border oklch(0.32 0.015 165); brand oklch(0.62 0.07 165); accent oklch(0.76 0.12 72) | #d9a45a (lighter desaturated marigold).

## Spacing, radius, shadow

- Spacing base: 8px; scale: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128
- Radius: two values — `--radius: 4px` (surfaces, buttons, frames) and `--radius-pill: 999px` (small inline tags only)
- Shadow approach: **defined edge** — hairline borders and rules carry structure. A single soft shadow is reserved for the two genuinely floating product screenshots (hero, focus), never stacked with a hairline border on the same element.

## Layout and composition

- Grid: 12-column editorial, max content 1180px, asymmetric gutter
- Spacing rhythm: tight within a group (8-16px), generous between groups (48-64px), large between sections (96-128px)
- Signature layout move: asymmetric split hero — left-aligned serif headline on parchment, product screenshot overlapping a framed misty-mountain photo on the right (product-as-hero, not centered, not full-bleed veil)
- Density: airy | Scanning: Z (hero) then F (content)
- Responsive: mobile-first; breakpoints 720px, 960px, 1180px (content-driven, not device-named)

## Components and states

- Button hierarchy: one primary (ink filled) per view; secondary (outlined); tertiary (text link with arrow). States: hover (bg/tint + arrow nudge), active (scale 0.98), focus (2px saffron box-shadow ring, offset 2px), disabled (muted + no shadow). No color-by-meaning.
- Nav: plain text links; hover = hairline underline; active = ridgeline underline with a saffron summit tick. No pill chips, no floating bar.
- FAQ: native `<details>`/`<summary>`, chevron rotates 180deg, single-open accordion.
- Focus ring: box-shadow `0 0 0 2px var(--paper), 0 0 0 4px var(--accent)`, follows radius.

## Motion

- Duration scale: instant 100ms / fast 150ms / normal 200ms / slow 300ms
- Easing: ease-out cubic-bezier(0.23, 1, 0.32, 1) for enter; ease-in-out cubic-bezier(0.77, 0, 0.175, 1) for on-screen movement
- What animates: transform and opacity only; no layout properties; no scroll-reveal hiding (content visible by default); no animate-everything
- Reduced motion: motion gated behind `prefers-reduced-motion: no-preference`; reduced = opacity fade only

## Iconography

- Set: inline, hand-drawn 24px grid, 1.75px stroke, round caps/joins (functional only: sun/moon, menu/close, arrow, check, chevron). No icon-tile feature cards.

## Imagery and illustration

- Mode: real product screenshots (dashboard, focus mode, widgets, web app) + one misty-mountain photograph
- Rules: photo is warm-graded toward the palette (slight desaturation + warm tint); product screenshots are framed with a hairline border; no stock/AI/Corporate-Memphis
- Avoid: people pointing at laptops, gradient blobs, glossy isometric tech, raw Midjourney
- Text-over-image contrast: guarantee via a graded overlay; body text never sits on the photo without a scrim

## Dark mode

- Base bg: oklch L 0.20 (near-black pine, not #000) | fg: off-white oklch(0.94) not #FFF
- Elevation ramp: surface +3-4 L over bg; borders lighter than surface
- Accent: lighter, desaturated marigold | theme switch: suppress transitions during swap

## Accessibility

- Contrast: AA verified both modes (body >= 4.5:1, large >= 3:1) | Focus: visible 2px managed ring
- Keyboard: fully operable, skip link, Escape closes menu | Targets: >= 44px
- Color independence: yes (accent never the only signal) | Reduced motion: yes | Notes: aria-expanded on toggle, aria-current on active nav, semantic headings in order

## Tokens (source of truth)

```css
:root {
  --font-display: "Fraunces", Georgia, serif;
  --font-body: "Schibsted Grotesk", system-ui, sans-serif;
  --font-devanagari: "Kohinoor Devanagari", "Nirmala UI", "Noto Sans Devanagari", sans-serif;
  --color-bg: oklch(0.96 0.018 92);
  --color-surface: oklch(0.985 0.008 92);
  --color-fg: oklch(0.26 0.022 165);
  --color-muted: oklch(0.50 0.02 165);
  --color-faint: oklch(0.62 0.016 165);
  --color-border: oklch(0.85 0.016 92);
  --color-brand: oklch(0.44 0.06 165);
  --color-accent: oklch(0.64 0.15 62);
  --color-accent-fg: oklch(0.985 0.008 92);
  --radius: 4px;
  --radius-pill: 999px;
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --dur-fast: 150ms; --dur-normal: 200ms; --dur-slow: 300ms;
}
@media (prefers-color-scheme: dark) { :root { /* dark overrides above */ } }
```

- Adapter: plain CSS custom properties

## Cards and surfaces

- Cards/surfaces: hairline border XOR soft shadow, radius 4px, padding >= 16px; no cards-in-cards; feature "cards" replaced by ruled index rows.

## Slop audit

- Date: 2026-11-05 | Result: pass (regenerated from a full slop-tell pass)
- Notes: removed Instrument Sans/Serif (banned convergence faces) in favor of Fraunces + Schibsted Grotesk; removed cream-by-reflex and the italic-serif hero; removed floating pill nav; removed 8 icon-tile cards + 01/02/03 markers; removed hairline+border+diffuse-shadow stacking and 22px blob radii; removed glassmorphism, radial "spotlight glow", and gradient veil; added the Ridgeline signature move and Bikram Sambat Devanagari accent. Accessibility gate passed (focus, keyboard, contrast, targets).

## Changelog

- 2026-11-05: full redesign from the AI-default "cream + Instrument Serif + pill nav" to "Himal" Himalayan editorial; authored tokens in OKLCH; signature move Ridgeline.
