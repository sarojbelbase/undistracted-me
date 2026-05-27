# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build / Test / Dev

```bash
bun install                     # Install dependencies
bun run dev                     # Start Vite dev server on port 3000
bun run build                   # Production build → dist/
bun run build:chrome            # Production build + zip → builds/chrome.zip
bun run build:firefox           # Production build + Firefox manifest patch + zip → builds/
bun run start:firefox            # Build + run in Firefox via web-ext
```

**Testing:**

```bash
bun run test                    # Playwright E2E tests (auto-starts dev server)
bun run test:ui                 # Playwright in UI mode
bun run test:headed             # Playwright headed
bun run test:report             # Open Playwright HTML report
bun run test:unit               # Vitest unit tests (jsdom, one shot)
bun run test:unit:watch         # Vitest in watch mode
bun run test:unit:coverage      # Vitest with v8 coverage
```

## Architecture

This is a **React 19 browser extension** (Chrome + Firefox, Manifest V3) that replaces the new tab page with a distraction-free dashboard. Three modes coexist:

1. **Dashboard** — draggable grid of 16 widgets (responsive breakpoints: lg/md/sm/xs/xxs)
2. **Focus Mode** — cinematic fullscreen overlay with ambient panels, triggered by a toggle button or `Alt+Shift+F`
3. **LookAway** — scheduled eye-break overlay (20s duration) driven by `chrome.alarm`

**Tech stack:** React 19, Vite 8, `@crxjs/vite-plugin`, Tailwind CSS v4 (`@import "tailwindcss"` in App.css), Zustand with `persist` middleware, `react-grid-layout`, `dayjs`, Bun.

The extension also runs as a website (`https://undistractedme.sarojbelbase.com.np/`) via Vercel — `App.jsx` detects `typeof chrome === "undefined"` and loads Vercel Analytics accordingly. The `api/` directory contains Vercel serverless functions for the web deployment.

## State management (Zustand)

Four stores, in `src/store/`:

| Store | Persisted? | Key | Purpose |
|---|---|---|---|
| `useSettingsStore` | Yes | `undistracted_settings` | All user settings: accent, mode, cardStyle, canvasBg, LookAway config, focus mode toggles |
| `useWidgetInstancesStore` | Yes | `widget_instances` | Active widget instances `[id, type]` + per-widget settings map |
| `useLocationStore` | Yes | `location_state` | Lat/lon, city, timezone, sunrise/sunset, VPN detection |
| `useGoogleAccountStore` | No | — | Google OAuth connected state, profile, connect/disconnect actions |
| `useUIStore` | No | — | `accountsDialogOpen` and other ephemeral UI state |

**Store access pattern:** Use `useShallow` selector when subscribing to multiple fields to avoid re-renders. See `App.jsx:183-192` for the pattern.

## Theme system

`src/theme.js` applies CSS custom properties (`--w-*` tokens) to `:root` based on accent color + mode (light/dark). Two entry points prevent FOUC:

1. `src/themeInit.js` — imported first in `index.jsx`, sets `data-mode` and core vars synchronously from localStorage before React mounts
2. `src/theme.js` — imported by `App.jsx` and stores, re-applies full tokens on mount and on setting changes

`useAutoTheme` (`src/hooks/useAutoTheme.js`) resolves `mode: 'auto'` → light/dark using sunrise/sunset from `useLocationStore`.

**Card styles** (`flat`, `glass`, `soft`, `outlined`, `comic`) are defined in `src/constants/cardStyles.js` and applied via `--card-bg`, `--card-blur`, `--card-border`, `--card-shadow`, `--card-radius` CSS vars.

**Constraint:** `"Default"` accent is incompatible with dark/auto modes; it auto-switches to Blueberry.

## Widget architecture

Widgets are self-contained under `src/widgets/<name>/`. Each widget exports a `config.js` with:

```js
export default {
  type,           // unique string identifier
  title,          // display name
  icon,           // bootstrap-icons component (fill variant)
  category,       // grouping in WidgetCatalog
  description,
  x, y, w, h,     // default grid position (lg breakpoint)
  breakpoints: {}, // per-breakpoint overrides { md: { x, y, w, h }, sm: {...}, ... }
  Component,      // React component (receives { id, onRemove })
  settingsComponent, // optional settings panel
  enabled,        // toggle on/off
}
```

To **add a widget**: create the directory + `config.js`, then add it to `WIDGET_REGISTRY` in `src/widgets/index.js`. Registering in the registry auto-registers it in `WidgetGrid` and `WidgetCatalog`.

**BaseWidget** (`src/widgets/BaseWidget.jsx`) is the shared card wrapper — provides the three-dots menu, settings modal portal, and card styling via `--card-*` CSS vars.

**WidgetGrid** (`src/widgets/WidgetGrid.jsx`) uses `react-grid-layout`'s `Responsive` with `useContainerWidth()` (NOT `WidthProvider` — Vite CJS incompatibility). Layouts persist to localStorage key `widget_layout`. On mobile (< 480px), a plain vertical stack replaces RGL to avoid non-passive touch listener issues.

## Location & weather

`useLocationStore` resolves coordinates through a 3-tier pipeline: `navigator.geolocation` (TTL 6h) → IP geocoding via freeipapi.com/ipapi.co (TTL 30m) → Kathmandu fallback. Reverse-geocoding via Nominatim. VPN detection fires `location_changed` event if IP coords shift >100 km.

Weather widgets use **Open-Meteo** (free, no API key), reading coordinates from `useLocationStore`. Financial widgets proxy through `/np-api` and `/ml-api` (dev) — see `vite.config.ts:430-451`.

## Background service worker

`src/bg.js` — handles `chrome.alarm` for LookAway reminders, Pomodoro notifications, event reminders, and media session tracking. Communicates with content scripts and the React app via `chrome.runtime.sendMessage`. Message types: `POMODORO_DONE`, `EVENTS_UPDATED`, `COUNTDOWN_DONE`, `LOOKAWAY_SYNC`, `LOOKAWAY_FIRE`, `MEDIA_SESSION_UPDATE`, `MEDIA_SESSION_CLEAR`, `GET_CHROME_MEDIA`, `CHROME_MEDIA_ACTION`.

## Firefox build patching

`scripts/patch-manifest-firefox.mjs` runs after `vite build` for Firefox. It re-bundles the ES module `bg.js` chunks into a single IIFE (`bg-ff.js`) because Firefox doesn't support `background.service_worker`, removes `favicon` permission and `oauth2` key (Chrome-only), and sets `background.scripts`.

## Tests

- **Playwright E2E** in `tests/playwright/specs/` — tests the full app in Chromium with a running dev server
- **Vitest unit tests** in `tests/unit/` — jsdom environment, setup file at `tests/unit/setup.js`, globals enabled

## Key constraints & conventions

- Icons use `react-bootstrap-icons` **fill variants** (e.g. `GearFill`, `ClockFill`). Custom SVG icons go in `src/assets/svg/` as stroke-based JSX.
- The `sharedClock.js` utility uses Web Locks API + BroadcastChannel for leader-election tick — one tab emits, all tabs consume.
- `@crxjs/vite-plugin` has CJS incompatibilities with `WidthProvider`; always use `useContainerWidth()` instead.
- `dayjs` is pre-configured with the timezone plugin (Asia/Kathmandu). Use `getTimeZoneAwareDayJsInstance()` from `src/utilities/index.js`.
- The `.docs/` folder contains detailed architecture documentation (`CONTEXT.md`, `WIDGETS.md`, `TODO.md`). Consult it for deeper context.
