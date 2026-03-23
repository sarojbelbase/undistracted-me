# Undistracted Me — Context

## Overview
React 19 browser extension (Chrome + Firefox, Manifest V3) replacing the new tab page. Two modes:
1. **Focus Mode** (`showWidgets=false`): Cinematic fullscreen view — Unsplash background with text-behind-image clock, ambient context panels (Pomodoro, Events, Stocks, Spotify, Weather)
2. **Dashboard** (`showWidgets=true`): Themed bg via `--w-page-bg`, draggable widget grid

## Tech Stack
- **React 19**, **Vite v8**, **@crxjs/vite-plugin**
- **Tailwind CSS v4** — `@import "tailwindcss"` in App.css (NOT `@tailwind base/components/utilities`)
- **Zustand** + `persist` middleware — global settings & widget instances stores
- **react-grid-layout** — `Responsive` + `useContainerWidth()` (NOT WidthProvider — Vite CJS incompatibility)
- **react-bootstrap-icons** — ALL icons, no hardcoded SVGs
- **dayjs** + timezone plugin (Asia/Kathmandu)

## State Management (Zustand)

### `useSettingsStore` (`src/store/useSettingsStore.js`)
Persistence key: `undistracted_settings`
Fields: `language`, `accent`, `mode`, `defaultView`, `dateFormat`, `clockFormat` (`'24h'|'12h'`), `showMitiInIcon`
Actions: `setLanguage`, `setAccent`, `setMode`, `setDefaultView`, `setDateFormat`, `setClockFormat`, `setShowMitiInIcon`
- `setAccent` / `setMode` call `applyTheme()` immediately
- `onRehydrateStorage` re-applies theme CSS vars after hydration (prevents FOUC)
- First-run migration: reads legacy per-key localStorage entries if `undistracted_settings` absent

### `useWidgetInstancesStore` (`src/store/useWidgetInstancesStore.js`)
Persistence key: `widget_instances`
Fields: `instances: [{ id, type }]`
Actions: `addInstance`, `removeInstance`, `restoreInstances`
- Falls back to `widget_enabled_ids` legacy key, then WIDGET_REGISTRY defaults

## Theme System (`src/theme.js`)
- `ACCENT_COLORS` — 11 colors: Default, Blueberry, Strawberry, Bubblegum, Grape, Orange, Banana, Lime, Mint, Latte, Cocoa
- `LIGHT_TOKENS` / `DARK_TOKENS` — full CSS var maps applied to `:root` via `applyTheme(accent, mode)`
- CSS vars set: `--w-accent`, `--w-accent-fg`, `--w-accent-rgb`, `--w-ink-1..6`, `--w-surface`, `--w-surface-2`, `--w-border`, `--w-page-bg`
- `data-mode` attribute on `<html>` drives `[data-mode="dark"]` overrides in `App.css`
- **Constraint**: `"Default"` accent is incompatible with dark mode. Switching to dark auto-selects Blueberry.
- `applyTheme` called on import (before React mounts) to prevent FOUC

## Design System (`App.css`)
- Tokens: `--w-ink-1` (#111827) → `--w-ink-6` (#d1d5db) for light; inverted for dark
- Classes: `w-display`, `w-heading`, `w-title-soft/bold`, `w-sub-soft/bold`, `w-period`, `w-body`, `w-caption`, `w-label`, `w-muted`, `w-dot`/`w-dot-active`
- `w-title-bold` and `w-sub-bold` use `var(--w-accent)` for accent-tinted text
- Keyboard accessibility: global `button:focus-visible` ring using `var(--w-accent)`
- Dark mode overrides: `[data-mode="dark"]` selectors patch hardcoded Tailwind classes
- Drag CSS: cursor only on `.widget-drag-handle`, options button hidden during drag

## Key Files
```
src/
  App.jsx              — root, mode toggle, settings overlay
  App.css              — design tokens, typography classes, grid overrides, dark mode patches
  theme.js             — ACCENT_COLORS, applyTheme(), useTheme()
  store/
    useSettingsStore.js     — Zustand persist: all app settings
    useWidgetInstancesStore.js — Zustand persist: active widget instances
  utilities/
    index.js           — convertEnglishToNepali, getTimeZoneAwareDayJsInstance
    unsplash.js        — Unsplash photo cache (see Unsplash section below)
    googleCalendar.js  — Google Calendar OAuth integration
    chrome.js          — Chrome extension API helpers
  components/
    FocusMode/
      index.jsx        — Cinematic focus mode (see Focus Mode section below)
      Settings.jsx     — Glass settings panel: dateFormat, clockFormat (24h/12h),
                         accent, mode, language, "New Photo" (only when Unsplash key set)
    Settings.jsx       — Dashboard global settings overlay
  widgets/
    WidgetGrid.jsx     — Responsive grid, per-breakpoint layout persistence
    BaseWidget.jsx     — forwardRef card, GearWide settings popover, cardStyle prop
    BaseSettingsModal.jsx — role="dialog", aria-modal, shared settings modal shell
    useWidgetSettings.js — per-widget localStorage (widgetSettings_${id})
    useEvents.js       — shared events store: module-level cache, SYNC_EVENT broadcast,
                         useEvents() + useGoogleCalendar() + useGoogleProfile() hooks
    WidgetCatalog.jsx  — widget picker drawer with categories
    settingsIO.js      — settings import/export helpers
    index.js           — WIDGET_TYPES, WIDGET_REGISTRY (13 widgets), all exports
    clock/             — live 1s clock, 24h/12h, extra timezone rows, time-aware greetings
    dateToday/         — weekday + date, BS/AD toggle
    dayProgress/       — 24-dot grid, 1-min interval
    events/            — CreateModal (Today/Tomorrow/Custom chips), AllEventsModal,
                         Google Calendar sync, both modals use createPortal(…, document.body)
    countdown/         — reads useEvents, nearest future event
    calendar/          — BS/AD, event dots + tooltip portal, today = accent fill + white text
    weather/           — OpenWeatherMap API, geolocation, VITE_OWM_API_KEY in .env, °C/°F toggle
    notes/             — textarea, localStorage, accent color picker, hide/expand/collapse
    bookmarks/         — Google Favicon API, chrome.topSites + manual Pinned, AddModal
    pomodoro/          — pick (preset pills) → timer; syncs { running, remaining, total, preset }
                         to localStorage key fm_pomodoro for Focus Mode to read
    spotify/           — PKCE OAuth2 via chrome.identity.launchWebAuthFlow, album art Canvas
                         color extraction, 5s polling + local tick between polls
                         NOTE: token refresh failure does NOT clear localStorage tokens —
                         only disconnectSpotify() wipes them. not_authenticated → setTrack(null)
                         NOT setConnected(false), to avoid re-showing the onboarding screen.
    facts/             — daily interesting fact widget
    stock/             — NEPSE stock tickers (see Stock Widget section)
```

## Widget Registry (13 widgets)
```
clock, dateToday, dayProgress, countdown, events, calendar, pomodoro, notes,
weather, facts, bookmarks, spotify, stock
```

## Focus Mode Architecture (`src/components/FocusMode/index.jsx`)

Layered z-index composition achieving text-behind-image depth effect:

| z | Layer | Notes |
|---|---|---|
| 0/1 | Two Unsplash photo slots | 2.5s opacity crossfade between images |
| 2 | Cinematic vignette | Radial + vertical gradient |
| 10 | **Clock digits** (odometer roller) | Sits UNDER the foreground depth overlay |
| 15 | **Foreground depth overlay** | Same photo, masked transparent→opaque top→bottom — terrain/objects appear IN FRONT of digits |
| 20 | Greeting + photo attribution | |
| 22 | Left panel + Right panel | Glass blur cards (`blur(22px)`) |
| 30 | Top bar | Auto-hides after 3s idle in fullscreen |

### Top bar center: `WeatherTopBadge`
- Reads `widgetSettings_weather` from localStorage
- Format: `☁ 22°C · Mon, 23 Mar 2026`
- Polls OWM every 30 min

### Left panel (vertically centered with clock)
- `PomodoroPanelCard` — reads `fm_pomodoro` localStorage every 1s; shows timer + drain bar
- `EventPanelCard` — active event (priority) or soonest upcoming; title + time-until
- `StocksPanelCard` — reads `widget_instances` → `widgetSettings_${id}`, polls every 5min; symbol + price + ↑↓%

### Right panel
- `SpotifyPanel` — full square album art, progress bar, prev/play/next controls
- Local 1s progress tick between 5s Spotify polls for smooth bar movement

### Data hooks (defined in index.jsx)
- `useFocusWeather()` — reads widgetSettings_weather, fetches OWM
- `useFocusStocks()` — reads widget_instances → widgetSettings_${id}, fetchChart every 5min
- `useFocusPhoto()` — manages slotA/slotB crossfade with Unsplash utility

### FocusModeSettings panel
- Date Calendar: CE / BS
- Clock Format: 24h / 12h (persisted via `clockFormat` in `useSettingsStore`)
- Appearance: Light / Dark
- Accent: color swatches
- Language: Nepali language select
- Background Photo: "New Photo" button (only when `VITE_UNSPLASH_ACCESS_KEY` is set)

## Unsplash Photo Utility (`src/utilities/unsplash.js`)
- Requires `VITE_UNSPLASH_ACCESS_KEY` in `.env`
- localStorage key: `fm_unsplash_cache` — stores up to 6 photo objects (URLs only, no image data)
- Each item: `{ id, url, regular, small, color, author, authorUrl, photoUrl, query, cachedAt }`
- TTL: 45 min — advances to next cached photo when head is stale
- 12 curated queries (zen/landscape/nature), rotates to avoid repeats
- Pre-fetches in background when cache < 3 items
- Exports: `getCurrentPhoto`, `rotatePhoto`, `prewarmPhotos`, `getCachedPhotoSync`, `hasUnsplashKey`, `clearPhotoCache`
- Attribution: `photo.author + " · Unsplash"` rendered bottom-right of Focus Mode

## Stock Widget (`src/widgets/stock/`)

### Data Source
- **API**: `https://www.merolagani.com/handlers/TechnicalChartHandler.ashx`
- **Range**: 90 days rolling (`now - 90*24*3600` → `now`), dynamic Unix timestamps
- **Response**: `{ t, o, h, l, c, v, s }` — OHLCV arrays; `s === "ok"` on success
- `c[n-1]` → LTP, `c[n-2]` → prevClose, `c[]` → sparkline, OHL at `[n-1]`
- Company list: `https://nepalipaisa.com/api/GetCompanies` (POST)

### UI Modes
- **Single** (1 stock): large LTP + change + O/H/L + sparkline bleeds edge-to-edge
- **Multi** (2–3 stocks): 2-line rows (symbol / price | % change)

### Utilities (`utils.js`)
`fetchChart`, `fetchCompanies`, `buildSparklinePaths` (LTTB + Catmull-Rom), `priceStats`, `fmtPrice`, `fmtOHL`, `fmtVolume`, `humanizeAge`

## Drag System (WidgetGrid.jsx)
- `draggableHandle=".widget-drag-handle"` — only the 3-dot pill notch triggers drag
- `LAYOUT_VERSION = ACTIVE_WIDGETS.length` — auto-busts saved layout when widget count changes
- `document.addEventListener('mouseup', clearDragging)` safety net prevents grid freeze

## Google Calendar / Profile Integration
- OAuth via `chrome.identity.getAuthToken` with scopes: `calendar.readonly`, `userinfo.profile`, `userinfo.email`
- Cache: `widget_gcal_cache` + `widget_gcal_cache_time`
- `useGoogleProfile()` — avatar + name + email in Settings panel

## Accessibility
- BaseWidget: `aria-label`, `aria-haspopup`, `aria-expanded`, `role="menu"`, `role="menuitem"`
- BaseSettingsModal: `role="dialog"`, `aria-modal`, `aria-label` on close
- Global `button:focus-visible` ring using `var(--w-accent)`

## Manifest Permissions
```json
"permissions": ["identity", "storage", "geolocation", "topSites", "notifications", "alarms"]
"host_permissions": [
  "https://api.spotify.com/*",
  "https://accounts.spotify.com/*",
  "https://nepalipaisa.com/*",
  "https://www.merolagani.com/*",
  "https://api.unsplash.com/*"
]
```

## Dev Proxy (`vite.config.ts`)
```js
'/np-api' → 'https://nepalipaisa.com/api'
'/ml-api' → 'https://www.merolagani.com/handlers/TechnicalChartHandler.ashx'
```

## localStorage Keys
| Key | Contents |
|---|---|
| `undistracted_settings` | Zustand: language, accent, mode, defaultView, dateFormat, clockFormat, showMitiInIcon |
| `widget_instances` | Zustand: `[{ id, type }]` |
| `widgetSettings_${id}` | Per-widget settings |
| `widget_events` | Events array `[{ id, title, startDate, startTime, endDate, endTime }]` |
| `widget_grid_layouts` | `{ lg: [...], md: [...], ... }` per-breakpoint |
| `fm_pomodoro` | `{ running, remaining, total, preset }` written by Pomodoro widget |
| `fm_unsplash_cache` | `[{ id, url, regular, color, author, ... }]` max 6 items |
| `spotify_tokens` | `{ access_token, refresh_token, expires_at }` |
| `spotify_profile` | Cached Spotify user profile |
| `widget_gcal_cache` | Cached Google Calendar events |

## Event Shape
`{ id, title, startDate, startTime, endDate, endTime }` — dates `YYYY-MM-DD`, times `HH:MM` 24h

## ENV Variables
| Variable | Used by |
|---|---|
| `VITE_OWM_API_KEY` | Weather widget — OpenWeatherMap |
| `VITE_UNSPLASH_ACCESS_KEY` | Focus Mode backgrounds — Unsplash |

## Key Patterns & Gotchas
- **Events double-add bug**: NEVER mutate state inside `setX(prev => ...)` when calling `dispatchEvent` — StrictMode calls updaters twice. Use module-level cache + direct mutation.
- **Modal portals**: MUST use `createPortal(…, document.body)` — CSS `transform` in react-grid-layout breaks `position:fixed` stacking context
- **Cross-widget sync**: `window.dispatchEvent(new Event('widget_events_changed'))` same-page; `storage` event cross-tab
- **Per-breakpoint layout**: save `allLayouts` (2nd arg of `onLayoutChange`), not `currentLayout`
- **Drag stopPropagation**: `onMouseDown={e => e.stopPropagation()}` on buttons inside widgets
- **Spotify re-auth loop**: refresh token failure must NOT call `localStorage.removeItem(TOKEN_KEY)`. Only `disconnectSpotify()` clears tokens. `not_authenticated` in fetchPlayback → `setTrack(null)`, NOT `setConnected(false)`
- **Focus Mode depth effect**: clock digits at z10, foreground photo overlay at z15 with gradient mask — this puts the photo's foreground visually in front of digits

## Commands
- `npm run dev` — Vite dev server
- `npm run build` — extension build (outputs to `dist/`)


## Tech Stack
- **React 19**, **Vite**, **@crxjs/vite-plugin**
- **Tailwind CSS v4** — `@import "tailwindcss"` in App.css (NOT `@tailwind base/components/utilities`)
- **react-grid-layout** — `Responsive` + `useContainerWidth()` (NOT WidthProvider — Vite CJS incompatibility)
- **dayjs** + timezone plugin (Asia/Kathmandu)
- **No external icon library** — all icons are inline SVGs

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
- Keyboard accessibility: global `button:focus-visible` / `[role="button"]:focus-visible` ring using `var(--w-accent)` outline
- Dark mode overrides: `[data-mode="dark"]` selectors patch hardcoded Tailwind classes
- Drag CSS:
  - `.react-grid-item { cursor: default }` — cursor ONLY on `.widget-drag-handle`
  - `.react-draggable-dragging .absolute.z-20 { opacity: 0 }` — hides 3-dot options button during drag
  - `.react-draggable-dragging .widget-drag-handle { opacity: 0.35 }` — ghost notch during drag
  - No `transform: scale()` on drag — prevents blur/separate-element look

## Key Files
```
src/
  App.jsx              — root, mode toggle, settings overlay
  App.css              — design tokens, typography classes, grid overrides, dark mode patches
  theme.js             — ACCENT_COLORS, applyTheme(), useTheme()
  widgets/
    WidgetGrid.jsx     — Responsive grid, per-breakpoint layout persistence, drag handle (3-dot pill notch)
    BaseWidget.jsx     — forwardRef card, 3-dot options menu (aria-label, role="menu"), mousedown click-outside
    BaseSettingsModal.jsx — role="dialog", aria-modal, shared settings modal shell
    useWidgetSettings.js — per-widget localStorage (widgetSettings_${id})
    useWidgetInstances.js — manages widget instances in the grid
    useEvents.js       — shared events + Google Calendar: module-level cache, SYNC_EVENT broadcast
    WidgetCatalog.jsx  — widget picker drawer with categories
    settingsIO.js      — settings import/export helpers
    index.js           — WIDGET_TYPES, WIDGET_REGISTRY (13 widgets), all exports
    clock/             — live 1s clock, 24h/12h, extra timezone rows, time-aware greetings
                         font: clamp(2rem,4.5vw,3.5rem) no-TZ | clamp(1.5rem,3vw,2.25rem) with-TZ
    dateToday/         — weekday + date, BS/AD toggle
    dayProgress/       — 24-dot grid, 1-min interval
    events/            — CreateModal (Today/Tomorrow/Custom chips), AllEventsModal,
                         Google Calendar sync, past events faded, both modals use createPortal
    countdown/         — reads useEvents, nearest future event
    calendar/          — BS/AD, event dots + tooltip portal, today = accent fill + white text
    weather/           — OpenWeatherMap API, geolocation, VITE_OWM_API_KEY in .env, °C/°F toggle
    notes/             — textarea, localStorage, ACCENT_COLORS color picker, hide/expand/collapse
                         aria-labels on eye/expand/collapse buttons
    bookmarks/         — Google Favicon API, chrome.topSites + manual Pinned section, AddModal
    pomodoro/          — pick (25/30/60/custom pills) → timer (SVG ring + Play/Pause/Reset)
    spotify/           — PKCE OAuth2 via chrome.identity.launchWebAuthFlow, album art Canvas color
                         extraction, 5s polling + local tick between polls
    facts/             — daily interesting fact widget
    stock/             — NEPSE stock ticker (1–3 symbols), sparkline, OHL display
                         see STOCK WIDGET section below
  components/
    Settings.jsx       — global settings: Light/Dark toggle, accent swatches, language,
                         Google Calendar OAuth connect/disconnect, Google profile card
```

## Widget Registry (13 widgets)
```
clock, dateToday, dayProgress, countdown, events, calendar, pomodoro, notes,
weather, facts, bookmarks, spotify, stock
```

## Stock Widget (`src/widgets/stock/`)

### Data Source
- **API**: `https://www.merolagani.com/handlers/TechnicalChartHandler.ashx`
- **Endpoint**: `?type=get_advanced_chart&symbol=SYMBOL&resolution=1D&rangeStartDate=START&rangeEndDate=END&from=&isAdjust=1`
- **Range**: 90 days rolling (`now - 90*24*3600` → `now`), dynamic Unix timestamps
- **Response**: `{ t, o, h, l, c, v, s }` — standard OHLCV arrays; `s === "ok"` on success
- **No caching needed** — single clean call, official closes only
- **host_permissions**: `https://www.merolagani.com/*` in manifest.json
- **Dev proxy** (`vite.config.ts`): `/ml-api` → `https://www.merolagani.com/handlers/TechnicalChartHandler.ashx`

### Data Mapping
- `c[n-1]` → **LTP** (today's official close)
- `c[n-2]` → **prevClose** (yesterday's close)
- `c[]` → sparkline (90-day daily closes)
- `o[n-1]` / `h[n-1]` / `l[n-1]` → today's O/H/L
- `v[n-1]` → today's volume (available but not currently displayed)

### Company List Source
- Still fetched from `https://nepalipaisa.com/api/GetCompanies` (POST)
- `host_permissions` includes `https://nepalipaisa.com/*`
- Dev proxy: `/np-api` → `https://nepalipaisa.com/api`

### UI Modes
**Single symbol** (1 stock):
- Symbol label + refresh age at top
- Large LTP price + change row (amount + %)
- **O / H / L** row — always visible, `flex-wrap` so it wraps on narrow widgets
- Sparkline (LTTB-downsampled 40 pts, Catmull-Rom bezier) bleeds edge-to-edge at bottom

**Multi symbol** (2–3 stocks):
- 2-line rows: symbol label (top, muted) + price (bottom, bold) | % change (right)
- No sparkline in list view

### Utilities (`utils.js`)
- `fetchChart(symbol)` — single API call, returns `{ prices, ltp, prevClose, open, high, low, volume }`
- `fetchCompanies()` — returns `[{ symbol, name, sector }]`
- `buildSparklinePaths(prices, vw, vh)` — LTTB + Catmull-Rom SVG paths
- `priceStats(chartData)` — `{ change, pct, dir }`, dir = `'up'|'down'|'flat'`
- `fmtPrice(n)` — `en-NP` locale, 2 decimal places
- `fmtOHL(n)` — 1 decimal place
- `fmtVolume(n)` — compact: `1.2B`, `50.3M`, `450K`
- `humanizeAge(ts)` — `'just now'`, `'2m ago'`, `'3h ago'`

## Drag System (WidgetGrid.jsx)
- `draggableHandle=".widget-drag-handle"` — RGL only starts a drag from this element
- Handle: single-row 3-dot pill (`rounded-b-xl`, `--w-surface-2` bg, no top border) centered at top of each widget
- Handle is `opacity-0` by default, `group-hover:opacity-100` on hover
- During drag: options button hidden (`opacity: 0`), notch ghost (`opacity: 0.35`), no scale/transform
- `LAYOUT_VERSION = ACTIVE_WIDGETS.length` — auto-busts saved layout when widget count changes
- Safety net: `document.addEventListener('mouseup', clearDragging)` prevents grid freeze

## Google Calendar / Profile Integration
- OAuth via `chrome.identity.getAuthToken` (Chrome) with scopes: `calendar.readonly`, `userinfo.profile`, `userinfo.email`
- Cache: raw API response stored in `widget_gcal_cache` + `widget_gcal_cache_time`
- `useGoogleProfile()` — avatar + name + email shown in Settings panel

## Accessibility
- `BaseWidget.jsx`: `aria-label="Widget options"`, `aria-haspopup="menu"`, `aria-expanded`, `role="menu"`, `role="menuitem"`
- `BaseSettingsModal.jsx`: `role="dialog"`, `aria-modal="true"`, `aria-label` on close button
- Notes widget: aria-labels on eye/expand/collapse buttons
- Global focus-visible ring on all interactive elements

## Manifest Permissions
```json
"permissions": ["identity", "storage", "geolocation", "topSites", "notifications", "alarms"]
"host_permissions": [
  "https://api.spotify.com/*",
  "https://accounts.spotify.com/*",
  "https://nepalipaisa.com/*",
  "https://www.merolagani.com/*"
]
```

## Dev Proxy (`vite.config.ts`)
```js
'/np-api' → 'https://nepalipaisa.com/api'          // company list
'/ml-api' → 'https://www.merolagani.com/handlers/TechnicalChartHandler.ashx'  // stock charts
```


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
