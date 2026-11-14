# AGENTS.md

Project guide for AI agents working in this repo.

## What this is

**Undistracted Me** — a Chrome/Firefox Manifest V3 extension that replaces the
new tab page with a Nepali-date dashboard: Focus Mode (cinematic clock) and
Dashboard (draggable widget grid).

- **Stack**: React 19 · Vite 8 · `@crxjs/vite-plugin` · Tailwind CSS v4 ·
  Zustand (+ `persist`) · react-grid-layout · Lexical · dayjs · Preact (legacy)
- **Backend**: Cloudflare Pages Functions in `api/` → `api.undistracted.me`
- **Landing**: Astro site in `landing/` → `undistracted.me`
- **Tests**: Vitest (unit) + Playwright (E2E)
- **Package manager**: **Bun** — use `bun`, not `npm`/`yarn`
- **Source of truth for architecture**: `.docs/CONTEXT.md`

## Commands

```bash
bun install
bun run dev                 # Vite dev server
bun run build               # Chrome build → dist/
bun run build:chrome        # Chrome Web Store zip → builds/
bun run build:firefox       # Firefox zip → builds/ (patches dist-firefox/)
bun run start:firefox       # run Firefox build via web-ext
bun run test                # Playwright E2E
bun run test:unit           # Vitest
bun run test:unit:coverage
```

## Skill routing

`.docs/SKILLS.md` inventories the 87 active skills (104 non-applicable ones are
archived in `skills-archive/`) with ✅/◐/— relevance and a per-task load table.
Defaults for this repo:

- Feature/UI work → `brainstorming`, `react-state-management`, `tailwind-design-system`, `interaction-design`
- Perf/debug → `systematic-debugging`, `vercel-react-best-practices`, `verification-before-completion`
- Tests → `javascript-testing-patterns`, `e2e-testing-patterns`, `webapp-testing`
- A11y → `accessibility-compliance`, `wcag-audit-patterns`
- Auth/secrets → `auth-implementation-patterns`, `secrets-management`
- Landing/SEO → `astro-seo`

Custom subagents live in `.opencode/agents/`: `react-guru`,
`extension-security-reviewer`, `mechanic` (SonarQube cleanup).

## Non-negotiable conventions

- **Tailwind v4**: `@import "tailwindcss"` in `App.css`. Never the v3
  `@tailwind base/components/utilities` directives.
- **Design tokens**: use `--w-*` CSS vars and the `w-*` typography classes.
  Do not hardcode colors that break dark mode; `"Default"` accent is
  incompatible with dark/auto mode.
- **Widget settings**: read/write via `useWidgetSettings(id)` (Zustand-backed).
  Do not read `widgetSettings_${id}` from localStorage in new code.
- **Modals**: always `createPortal(…, document.body)` — grid transforms break
  `position: fixed`.
- **Clock**: use `onClockTick(fn)` from `sharedClock.js`, never a per-component
  `setInterval(fn, 1000)`.
- **Google auth**: trigger OAuth through `useGoogleAccountStore.connect()`,
  never `getGoogleAuthToken(true)` straight from UI.
- **Tokens/PII**: `chrome.storage.local` for Spotify/Google tokens and
  calendar/contacts caches — never `localStorage`.
- **Spotify refresh failure**: do not clear tokens; only
  `disconnectSpotify()` wipes them.
- **StrictMode safety**: never mutate state inside `setX(prev => …)` when you
  also dispatch events (double-invoke bug).
- **Per-breakpoint layouts**: persist `allLayouts` from `onLayoutChange`.
- **Widgets**: register in `app/widgets/index.js` (`WIDGET_TYPES`,
  `WIDGET_REGISTRY`) and add a folder under `app/widgets/<name>/`.

## Before saying "done"

1. `bun run test:unit` and any affected Playwright spec.
2. `bun run build` (and `bun run build:firefox` if the manifest/SW changed).
3. Check light + dark mode and keyboard focus states.
4. No new console errors or extension-permission changes without a note.
