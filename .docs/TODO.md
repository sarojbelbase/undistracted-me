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

## 💡 Future Deliverables


### New Widgets & Features (Planned)

- [x] **Cross-device Sync** — `chrome.storage.sync` layer that mirrors settings, widget instances, events, and bookmarks across all signed-in Chrome instances. Last-write-wins with per-key timestamps; sync status badge ("Synced 2m ago"). Opt-out toggle in General settings.
  > _Feasibility: Very High — chrome.storage.sync is built-in; 100KB / 512-item limit is ample for settings + widget list + events. Doesn't sync ephemeral data (weather cache, Unsplash, RSS items)._

- [ ] **YouTube Watch Later Widget** — Shows the user's Watch Later playlist via YouTube Data API v3. `youtube.readonly` scope. Thumbnail cards with duration badge, title, channel name. Click to watch. Reuses `useGoogleAccountStore`. New widget under `src/widgets/youtube/`.
  > _Feasibility: High — API is straightforward; Watch Later playlist ID is always `WL`. Thumbnail-rich card layout matches existing media widget patterns._

- [ ] **OPML Import for RSS** — Import feeds from OPML files (standard RSS feed exchange format). Two methods: file picker + paste text. Parses with built-in `DOMParser`. Preview parsed feeds before import, merge with existing (skip duplicates). Add to existing RSS widget Settings.
  > _Feasibility: High — No dependencies; `DOMParser` is native. OPML structure is simple XML. ~80 lines of import logic in RSS settings._

- [x] **Website Blocker (Popup → Block)** — Block distracting sites directly from the popup. "Block this site" button next to the current tab card. Uses `chrome.declarativeNetRequest` dynamic rules. Blocked sites list in Settings with manual add/remove. Blocked page shows tasteful "This site is blocked" overlay with unblock option.
  > _Feasibility: High — declarativeNetRequest is the MV3-native approach, no host permissions needed. 5000-dynamic-rule limit is ample. New utility `siteBlocker.js` + Popup UI + Settings section._

- [ ] **Enriched Pomodoro** — Phase 1: sound chime on timer end, circular progress ring during timer. Phase 2: auto-start breaks (5/10/15 min), session notes, rain-sound toggle (reuses `api/audio/rain.js`).
  > _Feasibility: Very High — Incremental on existing pomodoro widget. Sound already wired (`api/audio/`). Stats stored in localStorage with same pattern as events._

- [x] **Expense Tracker Widget** — Simple 3-second expense logging: amount → category → done. Weekly summary with CSS bar breakdown by category. All world currencies (~50, curated), locale-aware formatting via `Intl.NumberFormat`. Export to CSV/JSON. Persists to localStorage, cap 500 entries. New widget under `src/widgets/expense/`.
  > _Feasibility: Very High — Zero dependencies; `Intl.NumberFormat` is native. Same localStorage pattern as Events/Pomodoro. Emoji category icons — no SVG work._

### Testing & DX

- [ ] **Playwright Visual Regression / Widget Snapshot Tests** — Per-widget screenshot snapshots in light + dark mode using `expect(page).toHaveScreenshot()`. `playwright.config.js` and `tests/playwright/specs/` already set up. Use `settingsIO` to load a known config fixture before each snapshot. Add `--update-snapshots` CI flag.
  > _Feasibility: Very High — Playwright is configured; snapshot API is built-in; only need fixture configs and snapshot baseline._

