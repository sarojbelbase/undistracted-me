# Undistracted Me — Roadmap & TODOs

## ✅ Done

### Core Architecture
- [x] Widget grid: drag, per-breakpoint layout persistence, dot-grid overlay
- [x] Design system: `--w-ink-*` tokens + typography classes in `App.css`
- [x] BaseWidget: 3-dot options menu, settings popover, forwardRef, click-outside
- [x] BaseSettingsModal: shared dialog shell with `role="dialog"`, `aria-modal`
- [x] **Zustand stores** (5 total): `useSettingsStore`, `useWidgetInstancesStore`, `useLocationStore`, `useGoogleAccountStore` (in-memory), `useUIStore` (in-memory)
- [x] `useSettingsStore`: `canvasBg`, `cardStyle`, `modePrefs`, `focusSearchBar`, `focusTasks`, focus search sub-settings, `mode='auto'`
- [x] `useWidgetInstancesStore`: `widgetSettings` map + `updateWidgetSetting`; mirrors to `widgetSettings_${id}` localStorage for Playwright compat
- [x] `useLocationStore`: 3-tier geolocation pipeline (browser → IP → hardcoded); Nominatim reverse-geocode; VPN detection; sun times
- [x] `useGoogleAccountStore`: connect/disconnect for all Google services; dispatches `google_account_changed` event
- [x] useWidgetInstances: add/remove widget instances dynamically
- [x] WidgetCatalog: categorized widget picker drawer
- [x] settingsIO: import/export widget settings
- [x] Keyboard shortcut: Alt+Shift+F to toggle Focus Mode

### Widgets (15 total)
- [x] **Clock** — 24h/12h, time-aware greetings, extra timezone rows, AM/PM inline; uses `onClockTick` from `sharedClock.js`
- [x] **Date Today** — weekday + BS/AD date
- [x] **Day Progress** (`progress`) — 24-dot grid
- [x] **Events** — localStorage, Google Calendar sync, create/delete, createPortal modals, Today/Tomorrow/Custom chips; `gcal_events_cache` in chrome.storage.local
- [x] **Countdown** — nearest future event from shared events; `COUNTDOWN_DONE` SW notification; `pomodoro_timer_state_${id}` per-instance state
- [x] **Calendar** — BS/AD toggle, event dots + tooltip, today = accent cell
- [x] **Weather** — **Open-Meteo** (no API key), geolocation via `useLocationStore`, °C/°F toggle
- [x] **Facts** — daily interesting fact
- [x] **Notes** — textarea, localStorage, color picker (WCAG contrast auto-detection), hide/expand/collapse
- [x] **Bookmarks** — Google Favicon API, chrome.topSites + manual Pinned, AddModal
- [x] **Quick Access** — top 6 chrome.topSites dock: favicon tiles, color extraction, letter fallback, hover scale
- [x] **Pomodoro** — pick timer → countdown; two keys: `pomodoro_timer_state_${id}` (full state + endTime) + `fm_pomodoro` (written while running only for Focus Mode PanelCard)
- [x] **Spotify** — PKCE OAuth, album art color extraction, 5s polling; fixed re-auth loop; multi-player (ChromeMediaStrip for YouTube/SoundCloud/etc.)
- [x] **Stock (NEPSE)** — merolagani.com API, single/multi symbol, sparkline, OHL row
- [x] **Occasions (Birthdays)** — Google Contacts sync (People API), manual entry, birthdays/anniversaries/special days, 3 nearest shown, color avatars

### Theme & Design
- [x] Global theme system: `useTheme` + `applyTheme`, light/dark/auto modes, 11 accent colors
- [x] `"Default"` accent locked/disabled in dark mode, auto-switches to Blueberry
- [x] `clockFormat` setting (`24h`/`12h`) in `useSettingsStore`, shown in Focus Mode settings
- [x] Auto theme (`useAutoTheme`): follow sunrise/sunset (solar algo, 3-tier geolocation)

### Drag UX
- [x] `draggableHandle` on 3-dot pill notch — only the handle triggers drag, not full widget
- [x] Options button hidden during drag; no scale/transform during drag

### Accessibility
- [x] BaseWidget: `aria-label`, `aria-haspopup`, `aria-expanded`, `role="menu"`, `role="menuitem"`
- [x] BaseSettingsModal: `role="dialog"`, `aria-modal`, `aria-label` on close
- [x] Global `button:focus-visible` ring using `var(--w-accent)`

### Focus Mode (zones-based architecture)
- [x] **Zone layout**: `config.js` ZONES object as single source of truth; `zones/` (Top/Center/Left/Right/Bottom/BottomRight), `panels/` (9 panels), `dialog/` (4 dialogs), `theme.jsx` FM design tokens
- [x] **CenterZone** — digit roller clock (z25, above foreground overlay); Search bar pill below clock
- [x] **TopZone** — item-based InfoStrip (weatherIcon SVG + temp + date + year); canvas/fullscreen/settings buttons; auto-hides after 3s idle
- [x] **LeftZone** — glass panel cards: Pomodoro, Event, **Occasion**, Stock, Spotify (order from ZONES.left)
- [x] **RightZone** — World clocks; reads Zustand `useWidgetInstancesStore` directly via `useFocusTimezones()`
- [x] **BottomZone** — greeting text
- [x] **BottomRightZone** — Google Tasks collapsible pill (bottom-right, z22)
- [x] **BackgroundPicker** — shared component in `src/components/ui/`; 4 modes: default, curated (Unsplash library), custom (URL), orb (7 palettes)
- [x] **Focus Mode Search Bar** — `focusSearchBar` toggle; full-screen dialog with web autocomplete (Google/DDG), top sites, history (`fm_search_history`, max 12)
- [x] **Focus Mode Tasks panel** — `focusTasks` toggle; `useFocusTasks()` optimistic CRUD via Google Tasks API; account dialog
- [x] **Focus Mode Settings** (`dialog/Settings.jsx`) — dateFormat, clockFormat, Search Bar toggle, Tasks toggle, Backgrounds button
- [x] **sharedClock.js** — Web Locks + BroadcastChannel leader-election; one tab holds lock and broadcasts second-aligned ticks; `onClockTick(fn)` API used by all zones
- [x] **useCenterOnDark** — returns `{ clock, search, greet }` booleans; Canvas pixel-sample
- [x] Fullscreen mode (Wake Lock API — keeps screen on)

### LookAway Eye-Break System
- [x] **LookAway overlay** — fullscreen eye-break with 3-orb animation, ring progress timer, 70+ witty messages (look away, drink water, stretch, talk to coworker, contact friend, check plant)
- [x] **7 color palettes** — random per overlay instance, independent of app accent
- [x] **Chrome alarm scheduling** — `UM_LOOKAWAY` alarm in SW; fires even when tab isn't open; `LOOKAWAY_SYNC` message to create/clear
- [x] **OS notifications** — optional notification when break is due (controlled by `lookAwayNotify`)
- [x] **Stale-break detection** — skips break if laptop was asleep during the interval (tracks `lastHiddenAt` via `visibilitychange`)
- [x] **Settings panel** — enable/disable toggle, interval picker (5–60 min), notification toggle, "Preview" button in dashboard Settings.jsx
- [x] **Dev fallback** — plain `setInterval` when no extension context available

### Stock Widget
- [x] Switched from nepalipaisa.com to merolagani.com API
- [x] Single clean fetch — 90-day daily OHLCV, LTP + prevClose + sparkline from same response
- [x] O/H/L always visible in single-stock view (flex-wrap, never clips)
- [x] Multi-symbol: 2-line rows (symbol above, price below) — no truncation

### Google Auth & Integrations
- [x] **Unified Google OAuth** (`googleAuth.js`) — Chrome (getAuthToken), Firefox (PKCE launchWebAuthFlow), Web (popup + PKCE + server-side `/api/auth/google/token`)
- [x] **Google Contacts** (`googleContacts.js`) — People API, paginated (up to 2000 contacts), birthdays + anniversaries
- [x] **Google Tasks** (`googleTasks.js`) — full CRUD (list/create/complete/delete) via `tasks.googleapis.com`; `useFocusTasks()` hook in Focus Mode
- [x] **Tokens in chrome.storage.local** — Spotify tokens + GCal/Profile cache migrated from localStorage (security)
- [x] **Google scopes**: `calendar.readonly`, `contacts.readonly`, `tasks`, `userinfo.profile`, `userinfo.email`
- [x] **obscureEnvKeys** Vite plugin — XOR-encodes VITE_GOOGLE_DESKTOP_CLIENT_ID/SECRET at build time
- [x] **Vercel API** — `api/photos/curated.js` (Blob store), `api/auth/google/token.js` (OAuth exchange), `api/favicon.js`

### Service Worker (`bg.js`)
- [x] Event reminders — notification 5 min before upcoming events
- [x] Pomodoro done notification + `COUNTDOWN_DONE` message
- [x] LookAway alarm handler (`UM_LOOKAWAY`); `LOOKAWAY_FIRE` manual preview message
- [x] Media session relay (`chromeSessions` map, up to 3 sessions)

### Media Session
- [x] `src/utilities/media.js` — content script injected into SoundCloud pages; detects playback via `navigator.mediaSession` + `<audio>/<video>` fallback
- [x] SW `chromeSessions` in-memory map (max 3 sessions); `GET_CHROME_MEDIA` / `CHROME_MEDIA_ACTION` / `MEDIA_SESSION_UPDATE` / `MEDIA_SESSION_CLEAR` messages
- [x] Spotify widget: `ChromeMediaStrip` — stacked player for non-active browser sessions (YouTube, SoundCloud, Apple Music, etc.)

---

---

## 💡 Future Deliverables

### Focus Mode Enhancements

- [x] **Focus Audio Scenes** — Rain & white-noise ambient audio player embedded directly in Focus Mode's TopZone NavBar. Uses a custom `useRainStream` hook and the Web Audio API to stream 30-second chunked `.wav` segments dynamically from Vercel Blob Storage (`/api/audio/rain` proxy), ensuring a gapless loop with zero local file bloat. Features a custom waveform+rain-drop SVG button (`RainNoiseIcon.jsx`) that triggers a 3-second ease-in-out master GainNode volume crossfade on both play and pause. Playback segment and offset position are persisted in `localStorage['rain_seg_pos']` so the stream seamlessly resumes after navigating away.

- [ ] **Focus Mode Color Grading** — Subtle tint overlay on the background photo (warm, cool, sepia, none) using CSS `mix-blend-mode`. Add `fmTint` field to `useSettingsStore` (`{ color, opacity, blend }`). Render a `<div>` at z-18 (between background z2 and cards z20) in `FocusMode/index.jsx`. `getPhotoTokens` could include a tint parameter if luminance logic needs updating. Picker in `dialog/Settings.jsx`.
  > _Feasibility: Very High — store + CSS layer only; no new dependencies._

- [ ] **Focus Session Log & Daily Score** — Track minutes in Focus Mode + interruptions (LookAway dismissed, tab switches). Persist daily aggregates to `fm_session_log` in `chrome.storage.local` (keyed by `YYYY-MM-DD`). Show a subtle score badge in TopZone/BottomZone. `useFocusMode.js` + `bg.js` visibility-change tracking already set up; extend with timestamps and accumulation logic.
  > _Feasibility: Medium — infrastructure (alarm, visibility, storage) exists; need scoring model + badge UI._

- [ ] **Focus Mode Manage Panels: "Undistracted Time" heatmap** — 7×24 opacity grid (GitHub-style) where each cell represents 1 hour of focused time. Renders as a new LeftZone panel or standalone widget. Reads from `fm_session_log`. Pure CSS grid + `opacity` derived from minutes-in-hour.
  > _Feasibility: Medium-High — storage tracking (from Session Log above) is the only prerequisite; the grid UI itself is straightforward._

### New Widgets

- [x] **AQI (Air Quality Index)** — Open-Meteo AQI endpoint (free, no key) using existing lat/lon from `useLocationStore`. Show as a small breathing dot (green → purple) + PM2.5/AQI value inside the Weather widget or as a separate `aqi` widget. Extend `src/widgets/weather/utils.jsx` fetch logic or create `src/widgets/aqi/`.
  > _Feasibility: Very High — same Open-Meteo base URL, location already resolved, pattern matches existing weather calls._

- [ ] **Daily Quotes Widget** — Hourly rotating wisdom quotes. `src/widgets/facts/` already does deterministic daily rotation with `getDailyIndex()` and 100+ entries in `data/facts.js`. Create sibling `src/widgets/quotes/` (or extend Facts) with a static bundled JSON of quotes + optional `api.quotable.io` fetch. Refresh on the hour via `onClockTick`.
  > _Feasibility: Very High — Facts widget is the template; near-identical implementation._

- [ ] **RSS / News Headlines** — User-defined RSS feeds or curated sources (Hacker News, BBC, Kantipur). New `rss` widget using `src/widgets/` pattern. Add `rss-parser` npm dep (lightweight) or parse via a small Vercel edge function to avoid CORS. Store feed URLs in `widgetSettings`. Auto-refresh every hour via `onClockTick`.
  > _Feasibility: Medium-High — widget system is mature; CORS requires proxy layer (Vercel edge fn fits existing `api/` pattern)._

### Canvas UX

- [ ] **Ghost Drag Mode** — During widget drag in WidgetGrid, show the dragged item as semi-transparent (`opacity: 0.35`, greyscale) while a ghost outline renders at the drop target. `WidgetGrid.jsx` already tracks `draggingId` state via `react-grid-layout` events; add CSS class on the dragged item and a placeholder-slot highlight. Pure CSS + minimal WidgetGrid change.
  > _Feasibility: Very High — `draggingId` already exists; CSS-only enhancement on top of existing `react-grid-layout` placeholder._

- [ ] **Command Palette (Cmd+K)** — Full command palette overlay. Commands: `/task [title]` (create Google Task), `/timer 25` (start Pomodoro), `/stock NEPSE:HDL` (jump to ticker), `/widget` (open WidgetCatalog). `Alt+Shift+F` keyboard pattern in `useFocusMode.js` is the model; `dialog/SearchBar.jsx` UI pattern is reusable. Register a global `Cmd+K` listener in `App.jsx`; build command registry mapping strings to store actions.
  > _Feasibility: High — keyboard infra + search dialog UI exist; command registry and dispatch logic are net-new._

### Testing & DX

- [ ] **Playwright Visual Regression / Widget Snapshot Tests** — Per-widget screenshot snapshots in light + dark mode using `expect(page).toHaveScreenshot()`. `playwright.config.js` and `tests/playwright/specs/` already set up. Use `settingsIO` to load a known config fixture before each snapshot. Add `--update-snapshots` CI flag.
  > _Feasibility: Very High — Playwright is configured; snapshot API is built-in; only need fixture configs and snapshot baseline._

### Infrastructure

- [ ] **Service Worker Background Pre-Fetch** — On `ALARM_TICK` (fires every minute in `bg.js`), periodically fetch weather + calendar data and cache to `chrome.storage.local`. App hydrates from cache on mount (instant display) and falls back to live fetch. Weather hook (`useWidgetInstancesStore`) and GCal cache (`gcal_events_cache`) already use `chrome.storage.local`; extend with SW-side fetch.
  > _Feasibility: High — alarm + storage pattern established; SW fetch + token forwarding needs care for auth-gated APIs (GCal)._

- [ ] **PWA Manifest (Desk Clock mode)** — Separate `vite build --mode pwa` output with a proper Web App Manifest and a Vite PWA service worker (`vite-plugin-pwa`). Allows pinning to secondary monitor/tablet as a standalone app. Requires parallel build config since `public/manifest.json` is currently the MV3 extension manifest (incompatible naming).
  > _Feasibility: Low-Medium — needs a parallel build pipeline; the extension and PWA manifests cannot share the same file; significant config overhead._


