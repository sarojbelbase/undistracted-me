# Undistracted Me — Context

## Overview
React 19 browser extension (Chrome + Firefox, Manifest V3) replacing the new tab page. Two modes:
1. **Focus Mode** (`showWidgets=false`): Cinematic fullscreen view — Unsplash/orb/custom background with text-behind-image clock, ambient context panels (Pomodoro, Events, Stocks, Spotify, Weather, World Clocks)
2. **Dashboard** (`showWidgets=true`): Themed bg via `--w-page-bg`, draggable widget grid
3. **LookAway**: Eye-break fullscreen overlay, triggered by scheduled `chrome.alarm`, shown over whichever mode is active

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
Fields: `language`, `accent`, `mode`, `defaultView`, `dateFormat`, `clockFormat` (`'24h'|'12h'`), `lookAwayEnabled`, `lookAwayInterval` (default 20 min), `lookAwayNotify`
Actions: `setLanguage`, `setAccent`, `setMode`, `setDefaultView`, `setDateFormat`, `setClockFormat`, `setLookAwayEnabled`, `setLookAwayInterval`, `setLookAwayNotify`
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
  App.jsx              — root, mode toggle, LookAway scheduler, settings overlay
  App.css              — design tokens, typography classes, grid overrides, dark mode patches
  theme.js             — ACCENT_COLORS, applyTheme(), useTheme()
  bg.js                — background service worker: event reminders, Pomodoro done
                         notification, LookAway chrome.alarm (UM_LOOKAWAY)
  media-cs.js          — media session content script for SoundCloud (injected by manifest)
  store/
    useSettingsStore.js     — Zustand persist: all app settings incl. LookAway fields
    useWidgetInstancesStore.js — Zustand persist: active widget instances
  utilities/
    index.js           — convertEnglishToNepali, getTimeZoneAwareDayJsInstance
    unsplash.js        — Unsplash photo library (see Unsplash section below)
    googleAuth.js      — Unified Google OAuth2: Chrome (getAuthToken), Firefox (PKCE
                         launchWebAuthFlow), Web (popup+PKCE+server exchange)
    googleCalendar.js  — Google Calendar OAuth integration + event cache
    googleContacts.js  — Google People API: contacts birthdays/anniversaries, pagination,
                         chrome.storage.local cache, manual birthdays localStorage
    chrome.js          — Chrome extension API helpers
    media.js           — shared media session content script (injected via manifest)
  components/
    FocusMode/
      index.jsx        — Cinematic focus mode (see Focus Mode section below)
      ClockDisplay.jsx — Digit roller clock (odometer animation)
      GreetingDisplay.jsx — Greeting text (positioned below clock)
      LeftPanel.jsx    — Glass cards: Pomodoro, Event, Stocks, Spotify
      TopBar.jsx       — Weather badge + date + controls
      WorldClocksPanel.jsx — Ambient right-side world clock panel
      BackgroundModal.jsx — Background picker: default|curated|custom|orb
      Settings.jsx     — Glass settings panel: dateFormat, clockFormat, "Change Background"
      hooks.js         — useFocusWeather, useFocusStocks, useFocusPhoto, useWakeLock,
                         useCenterOnDark, useFocusTimezones
      constants.js     — getGregorianDateParts, getBikramSambatDateParts, readPomodoro,
                         getNextEventToShow, FG_MASK, GLASS_CARD
    LookAway/
      index.jsx        — Fullscreen eye-break overlay: 70+ messages, 7 orb color palettes,
                         ring progress timer, dismiss / snooze
      hooks.js         — useLookAwayScheduler: syncs chrome.alarm via SW LOOKAWAY_SYNC
                         message; falls back to setInterval in dev; stale-break detection
    Settings.jsx       — Dashboard global settings overlay (appearance, LookAway config)
  widgets/
    WidgetGrid.jsx     — Responsive grid, per-breakpoint layout persistence
    BaseWidget.jsx     — forwardRef card, GearWide settings popover, cardStyle prop
    BaseSettingsModal.jsx — role="dialog", aria-modal, shared settings modal shell
    useWidgetSettings.js — per-widget localStorage (widgetSettings_${id})
    useEvents.js       — shared events store: module-level cache, SYNC_EVENT broadcast,
                         useEvents() + useGoogleCalendar() + useGoogleProfile() hooks
    WidgetCatalog.jsx  — widget picker drawer with categories
    settingsIO.js      — settings import/export helpers
    index.js           — WIDGET_TYPES, WIDGET_REGISTRY (15 widgets), all exports
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
    quickAccess/       — Top 6 chrome.topSites dock: favicon tiles with color extraction,
                         letter fallback, hover scale animation
    pomodoro/          — pick (preset pills) → timer; syncs { running, remaining, total, preset }
                         to localStorage key fm_pomodoro for Focus Mode to read
    spotify/           — PKCE OAuth2 via chrome.identity.launchWebAuthFlow, album art Canvas
                         color extraction, 5s polling + local tick between polls.
                         Multi-player: ChromeMediaStrip for browser media sessions (YouTube,
                         SoundCloud, etc.) via getChromeMedia / sendChromeMediaAction.
                         Tokens stored in chrome.storage.local (not localStorage).
                         NOTE: token refresh failure does NOT clear tokens —
                         only disconnectSpotify() wipes them. not_authenticated → setTrack(null)
                         NOT setConnected(false), to avoid re-showing the onboarding screen.
    facts/             — daily interesting fact widget
    stock/             — NEPSE stock tickers (see Stock Widget section)
    occasions/         — Birthdays, anniversaries, special days widget.
                         Sources: Google Contacts (People API) + manual entries.
                         Shows 3 next upcoming, sorted by daysAway.
                         Types: birthday (balloon), anniversary (heart), other (star).
                         Deduplicates between Google Contacts and manual entries.
```

## Widget Registry (15 widgets)
```
time:     clock, dateToday, dayProgress, countdown
planning: events, calendar, pomodoro, notes, occasions (birthdays)
info:     weather, facts, stock
tools:    bookmarks, quickAccess, spotify
```

## LookAway Eye-Break System (`src/components/LookAway/`)

### Overview
Fullscreen overlay that interrupts work for 20-second eye breaks (20-20-20 rule and more).

### Scheduling (`hooks.js` → `useLookAwayScheduler`)
- **Extension**: syncs a `chrome.alarm` (`UM_LOOKAWAY`) via `LOOKAWAY_SYNC` message to service worker. Alarm fires even when the new tab page isn't open.
- **Dev (no extension)**: falls back to plain `setInterval`.
- **Stale-break detection**: skips firing if the alarm fired while laptop was asleep (page was hidden for most of the interval).
- SW writes `lookaway_due` timestamp to `chrome.storage.local` when alarm fires. New tab reacts via `chrome.storage.onChanged`.
- Settings: `lookAwayEnabled`, `lookAwayInterval` (min, default 20), `lookAwayNotify` — all in `useSettingsStore`.

### Overlay (`index.jsx`)
- Full-page portal over everything, dark or light depending on app mode
- 3 concentric animated orbs (slow orbital spin CSS keyframes)
- 7 color palettes (independent of accent color), picked randomly per overlay instance
- SVG ring progress timer
- 70+ message pool across categories: look far away, drink water, stretch, talk to a coworker, contact a friend, check your plant
- Dismiss button (Escape or click) clears `lookaway_due` from chrome.storage.local

### Service Worker Side (`bg.js`)
- `UM_LOOKAWAY` alarm with `periodInMinutes`
- On fire: if `lookaway_notify` is `true`, fires OS notification; sets `lookaway_due` in `chrome.storage.local`
- `LOOKAWAY_SYNC` message: creates/clears alarm based on `enabled` + `intervalMins`
- `LOOKAWAY_FIRE_NOW` message: manual preview from Settings

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

### Data hooks (`hooks.js`)
- `useFocusWeather()` — reads widgetSettings_weather (with UUID fallback scan), fetches OWM
- `useFocusStocks()` — reads widget_instances → widgetSettings_${id}, fetchChart every 5min
- `useFocusPhoto()` — manages slotA/slotB crossfade with Unsplash utility
- `useWakeLock()` — Wake Lock API while in fullscreen
- `useCenterOnDark()` — Canvas pixel-sample to detect if current photo is dark/light; controls clock shadows
- `useFocusTimezones()` — reads clock widget settings for timezones to show in WorldClocksPanel

### FocusModeSettings panel (`Settings.jsx`)
- Date Calendar: CE / BS
- Clock Format: 24h / 12h (persisted via `clockFormat` in `useSettingsStore`)
- Background: opens `BackgroundModal`

### Background Modal (`BackgroundModal.jsx`)
4 background source modes persisted in `fm_bg_source`:
- **`default`**: bundled `bg.webp` (always available)
- **`curated`**: Unsplash photo library with crossfade, "Next Photo" / library browser
- **`custom`**: paste any https:// image URL; verified via Image load; persisted in `fm_custom_bg_url`
- **`orb`**: animated 3-orb dark background; color picked from `ORB_PALETTES` (7 colors)
- `getOrbRgb()` / `getCustomBgUrl()` — exported helpers
- `effectiveCenterOnDark` = `true` for non-curated sources (clock always uses dark-photo styling)

### World Clocks Panel (`WorldClocksPanel.jsx`)
- Ambient right-side panel — city name + time, 1s interval
- Reads `timezones` from clock widget settings via `useFocusTimezones()`
- Staggered spring entrance animation (`worldClockIn` keyframe)
- City label strips timezone abbreviation `(ET)` for a cleaner look

## Unsplash Photo Library (`src/utilities/unsplash.js`)
- **Source**: Vercel Blob proxy — `/api/photos/curated` (no direct Unsplash key needed in extension)
- **Auth**: `X-API-Key: VITE_PHOTOS_API_KEY` header to the curated endpoint
- localStorage key: `fm_unsplash_cache` — stores up to `LIBRARY_MAX=10` photo objects
- Each item: `{ id, url, regular, color, author, authorUrl, photoUrl, cachedAt }`
- Library model: `library[0]` = current photo. `rotatePhoto()` cycles head→tail (never discards). `downloadNewPhoto()` force-fetches and prepends. `deletePhoto(id)` removes. `jumpToPhotoById(id)` promotes to head.
- Pre-fetches in background when library runs low
- Exports: `getCurrentPhoto`, `rotatePhoto`, `downloadCuratedPhotos`, `downloadNewPhoto`, `deletePhoto`, `jumpToPhotoById`, `getPhotoLibrary`, `getCachedPhotoSync`, `getBgSource`, `setBgSource`
- Attribution: `photo.author + " · Unsplash"` rendered bottom-right of Focus Mode

## Google Auth (`src/utilities/googleAuth.js`)
Unified OAuth2 — works in all three environments:
- **Chrome**: `chrome.identity.getAuthToken()` — seamless, uses the signed-in Chrome account
- **Firefox**: PKCE authorization-code flow via `chrome.identity.launchWebAuthFlow()` + manual token exchange against Google. Client ID/secret XOR-encoded at build time by `obscureEnvKeys` Vite plugin.
- **Web (website mode)**: popup + PKCE + `/api/auth/google/token` server-side exchange.

Scopes: `calendar.readonly`, `contacts.readonly`, `userinfo.profile`, `userinfo.email`

Token storage: `chrome.storage.local` under key `google_ff_tokens` (Firefox) or `google_web_tokens` (web).

## Google Contacts (`src/utilities/googleContacts.js`)
- **API**: `https://people.googleapis.com/v1/people/me/connections` with `personFields=names,birthdays,events`
- Paginated fetch — up to 2000 contacts
- Cache: `contacts_birthdays_cache` in `chrome.storage.local` (migrated from localStorage)
- Synced-at: `contacts_birthdays_synced_at` in localStorage
- Manual entries: `manual_birthdays` in localStorage — `[{ id, name, type, month, day }]`
- Exports: `getContactBirthdays`, `loadCachedContacts`, `loadContactsSyncedAt`, `isContactsConnected`, `disconnectContacts`, `loadManualBirthdays`, `addManualBirthday`, `removeManualBirthday`, `clearContactsDisconnectedFlag`

## Media Session / Browser Media Integration
- `src/utilities/media.js` (loaded as service worker module) + `src/media-cs.js` (content script)
- Content script injected into all pages (manifest matches `<all_urls>`)
- Detects playback via `navigator.mediaSession` + `<audio>/<video>` element fallback
- Reports to background SW via `chrome.runtime.sendMessage({ type: 'MEDIA_UPDATE', ... })`
- SW relays to new tab via `chrome.tabs.sendMessage`
- Spotify widget: `getChromeMedia()` reads SW-cached sessions; `sendChromeMediaAction()` sends play/pause/skip to any tab
- `ChromeMediaStrip` in Spotify widget — compact strip for non-promoted browser sessions (YouTube, SoundCloud, Apple Music, etc.)

## Stock Widget (`src/widgets/stock/`)

### Data Source
- **API**: `https://www.merolagani.com/handlers/TechnicalChartHandler.ashx`
- **Range**: 90 days rolling, dynamic Unix timestamps
- **Response**: `{ t, o, h, l, c, v, s }` — OHLCV arrays; `s === "ok"` on success
- `c[n-1]` → LTP, `c[n-2]` → prevClose; OHL at `[n-1]`
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
- OAuth via unified `googleAuth.js` (Chrome: getAuthToken; Firefox/Web: PKCE)
- Scopes: `calendar.readonly`, `userinfo.profile`, `userinfo.email`, `contacts.readonly`
- Calendar cache: `widget_gcal_cache` + `widget_gcal_cache_time`
- `useGoogleProfile()` — avatar + name + email in Settings panel

## Accessibility
- BaseWidget: `aria-label`, `aria-haspopup`, `aria-expanded`, `role="menu"`, `role="menuitem"`
- BaseSettingsModal: `role="dialog"`, `aria-modal`, `aria-label` on close
- Global `button:focus-visible` ring using `var(--w-accent)`

## Manifest v3 (`public/manifest.json`) — version 3.0.0
```json
"permissions": ["identity", "storage", "geolocation", "topSites", "favicon",
                 "notifications", "alarms", "tabs"]
"host_permissions": [
  "https://undistractedme.sarojbelbase.com.np/*",
  "https://api.spotify.com/*",
  "https://accounts.spotify.com/*",
  "https://nepalipaisa.com/*",
  "https://www.merolagani.com/*",
  "https://people.googleapis.com/*",
  "https://www.googleapis.com/*",
  "https://oauth2.googleapis.com/*",
  "https://api.openweathermap.org/*",
  "https://api.unsplash.com/*"
]
```
Content scripts: `src/media-cs.js` injected into all pages (for browser media session detection).
`oauth2` section present for Chrome identity scopes.

## Vercel API (`api/`)
- `api/photos/curated.js` — Lists photos from Vercel Blob store (`backgrounds/` prefix). Auth via `X-API-Key`. CORS: chrome-extension://, moz-extension://, production origin.
- `api/auth/google/token.js` — Server-side Google OAuth token exchange (authorization_code + refresh_token grant types). Client secret never sent to browser. CORS: same origins + localhost.
- `api/favicon.js` — Favicon proxy helper.

## Dev Proxy (`vite.config.ts`)
```js
'/np-api' → 'https://nepalipaisa.com/api'
'/ml-api' → 'https://www.merolagani.com/handlers/TechnicalChartHandler.ashx'
```

## Storage Keys

### localStorage
| Key | Contents |
|---|---|
| `undistracted_settings` | Zustand: language, accent, mode, defaultView, dateFormat, clockFormat, lookAwayEnabled, lookAwayInterval, lookAwayNotify |
| `widget_instances` | Zustand: `[{ id, type }]` |
| `widgetSettings_${id}` | Per-widget settings |
| `widget_events` | Events array `[{ id, title, startDate, startTime, endDate, endTime }]` |
| `widget_grid_layouts` | `{ lg: [...], md: [...], ... }` per-breakpoint |
| `fm_pomodoro` | `{ running, remaining, total, preset }` written by Pomodoro widget |
| `fm_unsplash_cache` | `[{ id, url, regular, color, author, ... }]` max 10 items |
| `fm_bg_source` | `'default' \| 'curated' \| 'custom' \| 'orb'` |
| `fm_custom_bg_url` | Custom background image URL |
| `widget_gcal_cache` | Cached Google Calendar events |
| `widget_gcal_cache_time` | Timestamp of gcal cache |
| `contacts_birthdays_synced_at` | Timestamp of last Google Contacts sync |
| `contacts_has_cache` | Boolean flag — contacts cache exists in chrome.storage.local |
| `contacts_disconnected` | Flag set when user disconnects Google Contacts |
| `manual_birthdays` | `[{ id, name, type, month, day }]` manual occasion entries |
| `auto_theme_coords` | `{ lat, lon }` for auto sunrise/sunset theme |
| `auto_theme_coords_source` | `'browser' \| 'ip' \| 'default'` |

### chrome.storage.local
| Key | Contents |
|---|---|
| `spotify_tokens` | `{ access_token, refresh_token, expires_at }` — Spotify OAuth tokens |
| `spotify_profile` | Cached Spotify user profile `{ name, avatar }` |
| `contacts_birthdays_cache` | `[{ id, name, type, month, day }]` from Google People API |
| `google_ff_tokens` | Firefox Google OAuth tokens |
| `google_web_tokens` | Web mode Google OAuth tokens |
| `lookaway_due` | Timestamp when LookAway break is due (written by SW) |
| `lookaway_notify` | Boolean — whether to fire OS notification on break |

## Event Shape
`{ id, title, startDate, startTime, endDate, endTime }` — dates `YYYY-MM-DD`, times `HH:MM` 24h

## ENV Variables
| Variable | Used by |
|---|---|
| `VITE_OWM_API_KEY` | Weather widget — OpenWeatherMap |
| `VITE_PHOTOS_API_URL` | Curated photos proxy URL (default: production Vercel URL) |
| `VITE_PHOTOS_API_KEY` | Shared secret for curated photos Vercel endpoint |
| `VITE_GOOGLE_DESKTOP_CLIENT_ID` | Firefox/web Google OAuth client ID (XOR-encoded at build) |
| `VITE_GOOGLE_DESKTOP_CLIENT_SECRET` | Firefox/web Google OAuth client secret (XOR-encoded at build) |
| `PHOTOS_API_KEY` | Server-side key for `api/photos/curated.js` (same as VITE_PHOTOS_API_KEY) |
| `BLOB_READ_WRITE_TOKEN` | Auto-injected by Vercel for Blob store access |

## Key Patterns & Gotchas
- **Events double-add bug**: NEVER mutate state inside `setX(prev => ...)` when calling `dispatchEvent` — StrictMode calls updaters twice. Use module-level cache + direct mutation.
- **Modal portals**: MUST use `createPortal(…, document.body)` — CSS `transform` in react-grid-layout breaks `position:fixed` stacking context
- **Cross-widget sync**: `window.dispatchEvent(new Event('widget_events_changed'))` same-page; `storage` event cross-tab
- **Per-breakpoint layout**: save `allLayouts` (2nd arg of `onLayoutChange`), not `currentLayout`
- **Drag stopPropagation**: `onMouseDown={e => e.stopPropagation()}` on buttons inside widgets
- **Spotify re-auth loop**: refresh token failure must NOT clear `chrome.storage.local` tokens. Only `disconnectSpotify()` wipes them. `not_authenticated` in fetchPlayback → `setTrack(null)`, NOT `setConnected(false)`
- **Focus Mode depth effect**: clock digits at z10, foreground photo overlay at z15 with gradient mask — this puts the photo's foreground visually in front of digits
- **LookAway stale break**: skip if page was hidden (laptop asleep) for most of the interval — `lastHiddenAt` tracked via `document.visibilitychange`
- **Token security**: Spotify tokens + Google Contacts cache stored in `chrome.storage.local`, not `localStorage` — prevents other browser extensions from reading them
- **Key obfuscation**: `obscureEnvKeys` Vite plugin XOR-encodes `VITE_GOOGLE_DESKTOP_CLIENT_ID` / `SECRET` so they never appear as plain text in the JS bundle

## Commands
- `bun run dev` — Vite dev server
- `bun run build` — extension build (outputs to `dist/`)
- `bun run test` — Playwright E2E tests
- `bun run test:unit` — Vitest unit tests

