# Undistracted Me — Context

## Overview
React 19 browser extension (Chrome + Firefox, Manifest V3) replacing the new tab page. Two modes:
1. **Focused** (`showWidgets=false`): Dark `#18191B` bg, giant Nepali date + clock centered
2. **Dashboard** (`showWidgets=true`): Themed bg via `--w-page-bg`, draggable widget grid

## Tech Stack
- **React 19**, **Vite**, **@crxjs/vite-plugin**
- **Tailwind CSS v4** — `@import "tailwindcss"` in App.css (NOT `@tailwind base/components/utilities`)
- **react-grid-layout** — `Responsive` + `useContainerWidth()` (NOT WidthProvider — Vite CJS incompatibility)
- **react-bootstrap-icons** — all icons, no inline SVGs
- **dayjs** + timezone plugin (Asia/Kathmandu)

## Theme System (`src/theme.js`)
- `ACCENT_COLORS` — 11 colors: Default, Blueberry, Strawberry, Bubblegum, Grape, Orange, Banana, Lime, Mint, Latte, Cocoa
- `LIGHT_TOKENS` / `DARK_TOKENS` — full CSS var maps applied to `:root` via `applyTheme(accent, mode)`
- CSS vars set: `--w-accent`, `--w-accent-fg`, `--w-accent-rgb`, `--w-ink-1..6`, `--w-surface`, `--w-surface-2`, `--w-border`, `--w-page-bg`
- `data-mode` attribute on `<html>` drives `[data-mode="dark"]` overrides in `App.css`
- `useTheme()` — `{ accent, mode, setAccent, setMode }`, persists to `app_accent` / `app_mode`
- **Constraint**: `"Default"` accent is incompatible with dark mode. Switching to dark auto-selects Blueberry; Default swatch disabled in dark mode.
- `applyTheme` called on import (before React mounts) to prevent FOUC

## Design System (`App.css`)
- Tokens: `--w-ink-1` (#111827) → `--w-ink-6` (#d1d5db) for light; inverted for dark
- Classes: `w-display`, `w-heading`, `w-title-soft/bold`, `w-sub-soft/bold`, `w-period`, `w-body`, `w-caption`, `w-label`, `w-muted`, `w-dot`/`w-dot-active`
- `w-title-bold` and `w-sub-bold` use `var(--w-accent)` for accent-tinted text
- `w-dot-active` uses `var(--w-accent)`
- Dark mode overrides: `[data-mode="dark"]` selectors patch hardcoded Tailwind classes (bg-white, border-gray-*, text-gray-*, inputs)
- `.react-grid-item { cursor: default }` — drag cursor is ONLY on `.widget-drag-handle`, not on the whole widget

## Key Files
```
src/
  App.jsx              — root, mode toggle, settings overlay (showWidgets toggle button + gear icon)
  App.css              — design tokens, typography classes, grid overrides, dark mode patches
  theme.js             — ACCENT_COLORS, applyTheme(), useTheme()
  widgets/
    WidgetGrid.jsx     — Responsive grid, per-breakpoint layout persistence, drag handle system
    BaseWidget.jsx     — forwardRef card, GearWide settings popover, mousedown click-outside, cardStyle prop
    useWidgetSettings.js — per-widget localStorage (widgetSettings_${id})
    useEvents.js       — shared events + Google Calendar: module-level cache, SYNC_EVENT broadcast,
                         useGoogleCalendar(), useGoogleProfile() hooks
    index.js           — WIDGET_TYPES, WIDGET_REGISTRY (11 widgets), all exports
    clock/             — live 1s clock, 24h/12h, time-aware greetings
    dateToday/         — weekday + date, BS/AD toggle
    dayProgress/       — 24-dot grid, 1-min interval
    events/            — CreateModal (Today/Tomorrow/Custom chips), AllEventsModal,
                         Google Calendar sync, past events faded at 35% opacity,
                         both modals use createPortal(…, document.body)
    countdown/         — reads useEvents, nearest future event
    calendar/          — BS/AD, event dots + tooltip portal, today = accent fill + white text
    weather/           — OpenWeatherMap API, geolocation, VITE_OWM_API_KEY in .env,
                         description text uses var(--w-accent)
    notes/             — textarea, localStorage via useWidgetSettings, ACCENT_COLORS color picker
                         with WCAG luminance contrast auto-detection, cardStyle background
    bookmarks/         — Google Favicon API, chrome.topSites (Most Visited) + manual Pinned section,
                         AddModal with URL+name fields
    pomodoro/          — two phases: pick (25/30/60/custom pills) → timer (SVG ring + Play/Pause/Reset)
    spotify/           — PKCE OAuth2 via chrome.identity.launchWebAuthFlow, album art Canvas color
                         extraction, 5s polling + local tick between polls
  components/
    Settings.jsx       — global settings: Light/Dark toggle, accent swatches, language,
                         Google Calendar OAuth connect/disconnect, Google profile (avatar + name + email)
```

## Widget Registry (WIDGET_REGISTRY in index.js)
All 11 widgets, each with `{ id, type, enabled, x, y, w, h }`:
1. `clock` — CLOCK
2. `date-today` — DATE_TODAY
3. `day-progress` — DAY_PROGRESS
4. `events` — EVENTS
5. `weather` — WEATHER
6. `calendar` — CALENDAR
7. `countdown` — COUNTDOWN
8. `notes` — NOTES
9. `bookmarks` — BOOKMARKS
10. `pomodoro` — POMODORO
11. `spotify` — SPOTIFY

## Drag System (WidgetGrid.jsx)
- `draggableHandle=".widget-drag-handle"` — RGL only starts a drag from this element
- Handle is a 6-dot pill centered at the top of each widget (`absolute top-0 left-1/2 -translate-x-1/2 z-30`)
- Handle is `opacity-0` by default, `group-hover:opacity-100` on hover
- DO NOT add a blocker div (`absolute inset-0`) over widget content — it breaks all interactivity inside widgets
- Dot-grid overlay (`drag-dot-overlay` class) fades in only while `isDragging` is true
- **Safety net**: `document.addEventListener('mouseup', clearDragging)` — catches mouse released outside viewport so grid never freezes in dragging state
- `LAYOUT_VERSION = ACTIVE_WIDGETS.length` — auto-busts saved layout when widget count changes

## Google Calendar / Profile Integration
- OAuth via `chrome.identity.getAuthToken` (Chrome) with scopes: `calendar.readonly`, `userinfo.profile`, `userinfo.email`
- `useGoogleCalendar()` in `useEvents.js` — returns `{ events, loading, error, connected, refresh, disconnect }`
- Cache: raw API response stored in `widget_gcal_cache` + `widget_gcal_cache_time`; if cache exists on tab open, use it immediately without re-fetching (no spinner every load)
- Manual Sync button triggers a forced refresh
- `useGoogleProfile()` — fetches `https://www.googleapis.com/oauth2/v2/userinfo`, returns `{ profile: { name, email, picture }, ... }`
- Profile shown in Settings panel: avatar + name + email card when connected
- `manifest.json` OAuth2 block: `client_id`, scopes `calendar.readonly userinfo.profile userinfo.email`

## Manifest Permissions
```json
"permissions": ["identity", "storage", "geolocation", "topSites"]
"host_permissions": ["https://api.spotify.com/*", "https://accounts.spotify.com/*"]
```

## Critical Rules
- **Modals** → `createPortal(…, document.body)` — CSS `transform` in grid creates stacking context, breaks `position:fixed`
- **Cross-widget sync** → module-level cache + `dispatchEvent(new Event('widget_events_changed'))`. Never mutate inside `setState(prev =>)` when dispatching (StrictMode double-invoke = double event)
- **Drag buttons** → `onMouseDown={e => e.stopPropagation()}` on any interactive element inside a widget to prevent drag from starting
- **Per-breakpoint layout** → save `allLayouts` (2nd arg of `onLayoutChange`) not just current
- **Icons** → react-bootstrap-icons only, no hardcoded SVGs
- **Theme** → always use `var(--w-accent)` / `var(--w-ink-*)` — never hardcode colors in widgets
- **Chrome API guards** → always check `typeof chrome !== 'undefined' && chrome.runtime?.id` before calling any `chrome.*` API
- **Spotify / identity** → guard `chrome.identity?.launchWebAuthFlow` — not available outside extension context

## localStorage Keys
- `language`, `showWidgets`
- `app_accent`, `app_mode`
- `widgetSettings_${widgetId}` — per-widget settings
- `widget_events` — events array
- `widget_gcal_cache` — raw Google Calendar API response
- `widget_gcal_cache_time` — timestamp (ms) of last GCal fetch
- `widget_grid_layouts` — `{ lg: [...], md: [...], ... }` per breakpoint
- `widget_grid_layout_version` — equals `ACTIVE_WIDGETS.length`; mismatch clears saved layout

## Event Shape
`{ id, title, startDate, startTime, endDate, endTime }` — dates `YYYY-MM-DD`, times `HH:MM` 24h

## Commands
- `npm run dev` — Vite dev server (port 3000, CORS enabled)
- `npm run build` — extension build → `dist/`
