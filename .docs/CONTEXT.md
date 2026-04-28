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
Fields: `language`, `accent`, `mode` (`'light'|'dark'|'auto'`), `defaultView`, `dateFormat`, `clockFormat` (`'24h'|'12h'`), `lookAwayEnabled`, `lookAwayInterval` (default 20 min), `lookAwayNotify`, `canvasBg` (`{ type: 'solid'|'orb'|'curated'|'custom', orbId?, url? }`), `cardStyle` (`'flat'|'glass'`), `modePrefs` (`{ light: { cardStyle }, dark: { cardStyle } }`), `focusSearchBar` (bool, default true), `focusTasks` (bool, default true), `focusSearchTopSites`, `focusSearchDrive`, `focusSearchWeb`
Actions: `setLanguage`, `setAccent`, `setMode`, `setDefaultView`, `setDateFormat`, `setClockFormat`, `setLookAwayEnabled`, `setLookAwayInterval`, `setLookAwayNotify`, `setCanvasBg`, `setCardStyle`, `setFocusSearchBar`, `setFocusTasks`, `setFocusSearchTopSites`, `setFocusSearchDrive`, `setFocusSearchWeb`
- `setAccent` / `setMode` call `applyTheme()` immediately (skipped when `mode='auto'` — `useAutoTheme` applies theme after mount)
- `onRehydrateStorage` re-applies theme CSS vars after hydration (prevents FOUC)
- First-run migration: reads legacy per-key localStorage entries if `undistracted_settings` absent
- **`mode='auto'`**: resolved to light/dark by `useAutoTheme` using sunrise/sunset; falls back to OS `prefers-color-scheme` when location is unavailable
- **Constraint**: `'Default'` accent is incompatible with `'dark'` or `'auto'` mode — auto-switches to Blueberry

### `useWidgetInstancesStore` (`src/store/useWidgetInstancesStore.js`)
Persistence key: `widget_instances`
Fields: `instances: [{ id, type }]`, `widgetSettings: { [widgetId]: {...} }` (per-widget settings map, migrated from legacy `widgetSettings_*` localStorage keys on first hydration)
Actions: `addInstance`, `removeInstance`, `restoreInstances`, `updateWidgetSetting(widgetId, key, value)`
- `updateWidgetSetting` writes to Zustand and mirrors to legacy `widgetSettings_${widgetId}` localStorage key (Playwright test compat)
- Falls back to `widget_enabled_ids` legacy key, then WIDGET_REGISTRY defaults

### `useLocationStore` (`src/store/useLocationStore.js`)
Persistence key: `location_state`
Fields: `lat`, `lon`, `city`, `timezone`, `source` (`'browser'|'ip'|'default'|null`), `sunrise`, `sunset`, `isDay`, `status` (`'idle'|'loading'|'ready'|'error'`), `lastUpdated`
Actions: `refresh` (full 3-tier pipeline), `refreshSunTimes` (no-network sun recalculation)
- Resolution pipeline: `navigator.geolocation` → IP (freeipapi.com / ipapi.co) → Kathmandu hardcoded
- Reverse-geocodes city name via **Nominatim** (`nominatim.openstreetmap.org`)
- VPN detection: if IP coords shift >100 km from previous, dispatches `location_changed` window event
- `source='browser'` TTL: 6 h; `source='ip'` TTL: 30 min; managed by `useLocation` hook in `src/hooks/useLocation.js`

### `useGoogleAccountStore` (`src/store/useGoogleAccountStore.js`)
Not persisted — in-memory only.
Fields: `connected`, `profile` (`{ name, email, picture }|null`), `connecting`, `disconnecting`, `error`, `initialized`
Actions: `init` (silent token check on mount), `connect` (interactive OAuth UI), `disconnect` (signs out from Calendar + Contacts + Drive + Tasks)
- Dispatches `google_account_changed` window event on connect/disconnect so hooks can react without prop-drilling
- `USER_DISCONNECTED_KEY` (`localStorage`) prevents auto-reconnect after explicit user sign-out

### `useUIStore` (`src/store/useUIStore.js`)
Not persisted — in-memory only.
Fields: `accountsDialogOpen`
Actions: `openAccountsDialog`, `closeAccountsDialog`
- Allows any nested component to open the Accounts dialog without prop-drilling

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
                         SW messages: POMODORO_DONE, EVENTS_UPDATED, COUNTDOWN_DONE,
                         LOOKAWAY_SYNC, LOOKAWAY_FIRE, MEDIA_SESSION_UPDATE,
                         MEDIA_SESSION_CLEAR, GET_CHROME_MEDIA, CHROME_MEDIA_ACTION
                         chromeSessions: in-memory map of up to 3 browser media sessions
  store/
    useSettingsStore.js        — Zustand persist: all app settings incl. LookAway fields
    useWidgetInstancesStore.js — Zustand persist: active widget instances
    useLocationStore.js        — Zustand persist: centralized coords + sun times + city
    useGoogleAccountStore.js   — in-memory: Google OAuth connected/profile state; connect/disconnect actions
    useUIStore.js              — in-memory: accountsDialogOpen (avoids prop-drilling into Accounts dialog)
  hooks/
    useLocation.js       — called once in App root; drives useLocationStore lifecycle (TTL, VPN re-check, sun tick)
    useEvents.js         — canonical: useEvents, useGoogleCalendar, useGoogleProfile, formatEventTime
    useAutoTheme.js      — reads useLocationStore; drives light/dark via sunrise/sunset
    useArrangeMode.js    — widget arrange/edit mode state
    useSettingsPanel.js  — settings overlay open/close
    useCanvasBg.js       — canvas-based background effects
    useAgeLabel.js       — age string formatting helper
    useFocusMode.js      — Focus Mode toggle + keyboard shortcut (Alt+Shift+F)
  utilities/
    index.js           — convertEnglishToNepali, getTimeZoneAwareDayJsInstance
    unsplash.js        — Unsplash photo library (see Unsplash section below)
    googleAuth.js      — Unified Google OAuth2: Chrome (getAuthToken), Firefox (PKCE
                         launchWebAuthFlow), Web (popup+PKCE+server exchange)
    googleCalendar.js  — Google Calendar OAuth integration + event cache
    googleContacts.js  — Google People API: contacts birthdays/anniversaries, pagination,
                         chrome.storage.local cache, manual birthdays localStorage
    googleTasks.js     — Google Tasks API v1 wrapper: fetchGoogleTaskLists, fetchGoogleTasks,
                         createTask, updateTask, deleteTask — all with auto-retry on 401/403
    googleDrive.js     — Drive metadata search (name contains query, trashed=false);
                         returns up to 5 matches (id, name, mimeType, webViewLink);
                         uses drive.metadata.readonly scope; non-interactive token fetch
    sharedClock.js     — leader-election shared clock tick (Web Locks API + BroadcastChannel
                         "um:clock"); one tab holds lock and broadcasts second-aligned ticks
                         to all others; falls back to per-tab aligned interval;
                         API: `onClockTick(fn) → unsubscribeFn` — used by zones + clock widget
    chrome.js          — Chrome extension API helpers
    media.js           — media session content script (injected into SoundCloud pages) +
                         SW utility; detects playback via navigator.mediaSession + audio/video fallback
  components/
    FocusMode/
      index.jsx        — Cinematic focus mode root (see Focus Mode section below)
      config.js        — ZONES: single source of truth for all zone/item enable flags + order
      theme.jsx        — Focus Mode design tokens (FM_CARD_BG, FM_CARD_BLUR, FM_INK_1..4,
                         FM_SURFACE, FM_BORDER) + AnimatedCard, getPhotoTokens, getFMCardVars
      hooks.js         — useFocusWeather, useFocusStocks (re-export of widgets/stock/useStocks),
                         useFocusPhoto, useFocusSpotify, useChromeMedia, useFocusTasks,
                         useWakeLock, useCenterOnDark (returns { clock, search, greet }),
                         useFocusTimezones + search utilities (fetchSuggestions, suggestUrl,
                         getHistory, pushHistory)
      Settings.jsx     — wrapper that lazy-loads dialog/Settings.jsx
      zones/
        TopZone.jsx    — NavBar (canvas/fullscreen/settings buttons) + InfoStrip
                         (weatherIcon + weatherTemp + date + year)
        CenterZone.jsx — Clock (digit roller odometer) + SearchBar pill (if focusSearchBar)
        LeftZone.jsx   — Glass panel cards: Pomodoro, Event, Occasion, Stock, Spotify
        RightZone.jsx  — World clocks ambient panel
        BottomZone.jsx — Greeting text
        BottomRightZone.jsx — Google Tasks collapsible pill (if focusTasks, bottom-right)
      panels/
        Clock.jsx      — Digit roller clock (odometer animation)
        Greetings.jsx  — Greeting text
        Event.jsx, Pomodoro.jsx, Occasion.jsx, Stock.jsx, Spotify.jsx, Tasks.jsx, SearchBar.jsx
      dialog/
        Settings.jsx   — Glass settings panel: dateFormat, clockFormat, focusSearchBar toggle,
                         focusTasks toggle, "Backgrounds" button
        SearchBar.jsx  — Full-screen search dialog: web autocomplete (Google/DDG), top sites,
                         Google Drive file search, search history (fm_search_history, max 12)
        Tasks.jsx      — Google Tasks account dialog
        shared.jsx     — shared dialog primitives
    LookAway/
      index.jsx        — Fullscreen eye-break overlay: 70+ messages, 7 orb color palettes,
                         ring progress timer, dismiss / snooze
      hooks.js         — useLookAwayScheduler: syncs chrome.alarm via SW LOOKAWAY_SYNC
                         message; falls back to setInterval in dev; stale-break detection
    Settings.jsx       — Dashboard global settings overlay (appearance, LookAway config)
  ui/                  — shared UI components (see src/components/ui/ section below)
  widgets/
    WidgetGrid.jsx     — Responsive grid, per-breakpoint layout persistence
    BaseWidget.jsx     — forwardRef card, GearWide settings popover, cardStyle prop
    BaseSettingsModal.jsx — role="dialog", aria-modal, shared settings modal shell
    useWidgetSettings.js — backed by Zustand `useWidgetInstancesStore.widgetSettings`;
                           mirrored to `widgetSettings_${id}` localStorage for legacy compat
    useEvents.js       — @deprecated re-export stub; canonical path is src/hooks/useEvents.js
    WidgetCatalog.jsx  — widget picker drawer with categories
    settingsIO.js      — settings import/export helpers
    index.js           — WIDGET_TYPES, WIDGET_REGISTRY (15 widgets), all exports
    clock/             — live 1s clock, 24h/12h, extra timezone rows, time-aware greetings
    dateToday/         — weekday + date, BS/AD toggle
    progress/          — day progress (type: 'progress'); visual bar for day elapsed
    events/            — CreateModal (Today/Tomorrow/Custom chips), AllEventsModal,
                         Google Calendar sync, both modals use createPortal(…, document.body)
    countdown/         — own dedicated event store (COUNTDOWN_EVENTS); supports repeating countdowns;
                         per-instance pinned event (COUNTDOWN_PINNED_${id}); notification dedup (CD_NOTIFIED)
    calendar/          — BS/AD, event dots + tooltip portal, today = accent fill + white text
    weather/           — **Open-Meteo API** (free, no API key); reads coords from useLocationStore;
                         current + 12h hourly forecast; °C/°F toggle; animated WeatherAtmosphere
                         component; geocoding via geocoding-api.open-meteo.com for manual location
    notes/             — textarea, localStorage, accent color picker, hide/expand/collapse
    bookmarks/         — Google Favicon API, chrome.topSites + manual Pinned, AddModal
    quickAccess/       — Top 6 chrome.topSites dock: favicon tiles with color extraction,
                         letter fallback, hover scale animation
    pomodoro/          — pick (preset pills) → timer;
                         TWO storage keys: (1) `pomodoro_timer_state_${id}` — full state incl.
                         `endTime` for elapsed-time recovery on tab restore; (2) `fm_pomodoro`
                         — written ONLY while timer is running (for Focus Mode PanelCard);
                         removed when paused or in pick phase
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
time:     clock, dateToday, progress, countdown
planning: events, calendar, pomodoro, notes, occasions (birthdays)
info:     weather, facts, stock
tools:    bookmarks, quickAccess, spotify
```

WIDGET_TYPES values (type strings in `widget_instances` store):
`clock`, `dateToday`, `progress`, `events`, `weather`, `calendar`, `countdown`, `notes`, `bookmark`, `quickAccess`, `pomodoro`, `spotify`, `facts`, `stock`, `birthdays`

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
- `LOOKAWAY_FIRE` message: manual preview from Settings (fires immediately via `chrome.storage.local.set({ lookaway_due })`)

## Focus Mode Architecture (`src/components/FocusMode/`)

Zone-based layout driven by `config.js` ZONES object. Each zone is a separate component in `zones/`.

### Zone Layout
```
┌────────────────────── TOP (z31) ────────────────────────┐
│  [← Canvas]     weatherIcon temp · date year   [⛶][⚙] │
├──────────────────────────────────────────────────────────┤
│  LEFT (z22)     CENTER (z25)         RIGHT (z22)         │
│  panel cards    clock + search bar   world clocks        │
├────────────────────── BOTTOM (z20) ─────────────────────┤
│                      greeting                            │
└──────────────────── BOTTOM-RIGHT (z22) ─────────────────┘
                       Tasks pill
```

| z | Zone/Layer | Notes |
|---|---|---|
| 0/1 | Two photo slots | 2.5s opacity crossfade |
| 2 | Cinematic vignette | Radial + vertical gradient |
| 15 | Foreground depth overlay | Same photo, gradient mask transparent→opaque top→bottom |
| 20 | BottomZone | Greeting text + photo attribution |
| 22 | LeftZone + RightZone + BottomRightZone | Glass blur cards |
| 25 | CenterZone | Clock digits + Search bar |
| 31 | TopZone | NavBar + InfoStrip; auto-hides after 3s idle in fullscreen |

### TopZone (`zones/TopZone.jsx`)
- **NavBar**: Canvas-mode button, fullscreen toggle, settings button
- **InfoStrip**: weatherIcon (SVG) + temp + `·` + date + year (smaller) — item-based rendering driven by ZONES.top
- Reads weather from Zustand `useWidgetInstancesStore`; falls back to `useLocationStore` coords
- Polls **Open-Meteo** via `useFocusWeather()` — NOT OpenWeatherMap

### CenterZone (`zones/CenterZone.jsx`)
- Clock digit roller (odometer animation) via `panels/Clock.jsx`
- Search bar pill (below clock) when `focusSearchBar=true` — opens `dialog/SearchBar.jsx`

### LeftZone (`zones/LeftZone.jsx`)
Glass panel cards (order driven by ZONES.left.items):
- `PomodoroPanel` — reads `fm_pomodoro` localStorage; shows timer + drain bar
- `EventPanel` — active event (priority) or soonest upcoming; title + time-until
- `OccasionPanel` — next upcoming birthday/anniversary from occasions widget
- `StockPanel` — reads from Zustand `useWidgetInstancesStore`, polls every 5min; symbol + price + ↑↓%
- `SpotifyPanel` — album art, progress bar, prev/play/next; local 1s tick between 5s polls

### RightZone (`zones/RightZone.jsx`)
- World clocks ambient panel — city name + time, 1s tick via `onClockTick`
- Reads timezones from Zustand `useWidgetInstancesStore` (clock widget settings) via `useFocusTimezones()`
- Staggered spring entrance animation (`worldClockIn` keyframe)

### BottomZone (`zones/BottomZone.jsx`)
- Greeting text (`panels/Greetings.jsx`)

### BottomRightZone (`zones/BottomRightZone.jsx`)
- Google Tasks collapsible pill — bottom-right corner, z22
- Visible when `focusTasks=true` in `useSettingsStore`
- Full CRUD via `useFocusTasks()` hook (optimistic add/toggle/edit/delete)
- Opens `dialog/Tasks.jsx` for account management

### Focus Mode Search Bar (`dialog/SearchBar.jsx`)
- Full-screen search dialog triggered from CenterZone search pill
- Features: web autocomplete (Google `suggestqueries.google.com` / DDG `ac.duckduckgo.com`),
  Chrome top sites in empty state, Google Drive file search, search history
- History key: `fm_search_history` (localStorage, max 12 entries)
- Autocomplete controlled by `focusSearchTopSites`, `focusSearchDrive`, `focusSearchWeb` settings

### Focus Mode Settings (`dialog/Settings.jsx`)
- Date Calendar: CE / BS
- Clock Format: 24h / 12h
- Search Bar: on/off (`focusSearchBar`)
- Tasks: on/off (`focusTasks`)
- "Backgrounds" button → opens `BackgroundPicker` (`src/components/ui/BackgroundPicker.jsx`)

### Background Picker (`src/components/ui/BackgroundPicker.jsx`)
Shared component used in both Focus Mode and Dashboard canvas mode.
4 source modes (persisted in `fm_bg_source`):
- **`default`**: bundled `bg.webp`
- **`curated`**: Unsplash photo library with crossfade, "Next Photo" / library browser
- **`custom`**: paste any https:// image URL; verified via Image load; persisted in `fm_custom_bg_url`
- **`orb`**: animated 3-orb dark background; 7 color palettes (ORB_PALETTES)

### Data Hooks (`hooks.js`)
- `useFocusWeather()` — reads weather widget from Zustand `useWidgetInstancesStore`; fetches **Open-Meteo**
- `useFocusStocks()` — re-export of `widgets/stock/useStocks`
- `useFocusPhoto()` — manages slotA/slotB crossfade with Unsplash utility
- `useFocusSpotify()` — alias of shared `useSpotify` hook
- `useChromeMedia()` — reads SW-cached browser media sessions (YouTube, SoundCloud, etc.)
- `useFocusTasks()` — Google Tasks CRUD + loading state for BottomRightZone
- `useWakeLock()` — Wake Lock API while in fullscreen
- `useCenterOnDark()` — Canvas pixel-sample; returns `{ clock, search, greet }` booleans
- `useFocusTimezones()` — reads clock widget timezones from Zustand `useWidgetInstancesStore`

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

Scopes: `calendar.readonly`, `contacts.readonly`, `drive.metadata.readonly`, `tasks`, `userinfo.profile`, `userinfo.email`

Token storage:
- Firefox extension: `chrome.storage.local` under key `google_ff_tokens`
- Web mode: `sessionStorage` under key `google_web_tokens` (session-scoped; cleared on tab close)

High-level connect/disconnect managed via `useGoogleAccountStore` — do NOT call `getGoogleAuthToken` directly from UI components; go through the store.

## Google Contacts (`src/utilities/googleContacts.js`)
- **API**: `https://people.googleapis.com/v1/people/me/connections` with `personFields=names,birthdays,events`
- Paginated fetch — up to 2000 contacts
- Cache: `contacts_birthdays_cache` in `chrome.storage.local` (migrated from localStorage)
- Synced-at: `contacts_birthdays_synced_at` in localStorage
- Manual entries: `manual_birthdays` in localStorage — `[{ id, name, type, month, day }]`
- Exports: `getContactBirthdays`, `loadCachedContacts`, `loadContactsSyncedAt`, `isContactsConnected`, `disconnectContacts`, `loadManualBirthdays`, `addManualBirthday`, `removeManualBirthday`, `clearContactsDisconnectedFlag`

## Media Session / Browser Media Integration
- `src/utilities/media.js` — serves as both the SoundCloud content script (injected into `*://*.soundcloud.com/*`) and a shared utility module
- Detects playback via `navigator.mediaSession` + `<audio>/<video>` element fallback
- Reports to background SW via `chrome.runtime.sendMessage({ type: 'MEDIA_SESSION_UPDATE', ... })`
- SW manages `chromeSessions` in-memory map (keyed by tabId, max 3 entries ordered by activity)
- `GET_CHROME_MEDIA` → SW returns ordered sessions array to requester
- `CHROME_MEDIA_ACTION` → SW sends play/pause/next/prev to the source tab
- `Spotify widget: getChromeMedia()` reads SW-cached sessions; `sendChromeMediaAction()` sends commands
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
- Scopes: `calendar.readonly`, `contacts.readonly`, `drive.metadata.readonly`, `tasks`, `userinfo.profile`, `userinfo.email`
- Calendar events (PII) stored in **`chrome.storage.local`** under `gcal_events_cache`; one-time migration from legacy localStorage on first load
- `gcal_has_cache` — localStorage boolean flag for synchronous cache-existence checks
- `gcal_synced_at` — localStorage timestamp of last sync
- `useGoogleCalendar()` returns `{ gcalEvents, loading, connected, error, syncedAt, refresh, connect }`
- `useGoogleProfile()` — avatar + name + email; exported from `src/hooks/useEvents.js`

## Shared UI Components (`src/components/ui/`)
Key shared components:
- `AccountsDialog` — Google + Spotify account connect/disconnect sheet (opened via `useUIStore.openAccountsDialog()`)
- `AccountCard` — single service row within AccountsDialog
- `IntegrationRow` — status badge for integration health in widget settings
- `BackgroundPicker` — 4-mode background selector (shared by Focus Mode + Dashboard canvas)
- `CanvasBackground` — animated canvas orb background for Dashboard mode
- `OrbBackground` — pure CSS 3-orb animation (used in LookAway + BackgroundPicker)
- `WeatherAtmosphere` — animated SVG weather illustration (sun, rain, snow, cloud, fog, thunder)
- `PillButton` — pill-shaped toggle button (design system primitive)
- `SegmentedControl` — multi-option radio-style control
- `SegmentedDateTime` — date/time segment picker
- `ControlCluster` — grouped settings controls
- `Modal` — generic portal modal shell
- `Popup` — lightweight anchor-positioned floating panel
- `TabRow` — tabbed navigation row
- `FaviconIcon`, `RefreshIcon`, `TooltipBtn`, `ConfirmButton`, `Input`, `RadioGroup`, `TintedChip`, `EventRow`, `FocusModeButton`, `SettingsInput`

## Accessibility
- BaseWidget: `aria-label`, `aria-haspopup`, `aria-expanded`, `role="menu"`, `role="menuitem"`
- BaseSettingsModal: `role="dialog"`, `aria-modal`, `aria-label` on close
- Global `button:focus-visible` ring using `var(--w-accent)`

## Manifest v3 (`public/manifest.json`) — version 3.0.0
```json
"permissions": ["identity", "storage", "geolocation", "topSites", "favicon",
                 "notifications", "alarms", "tabs", "scripting"]
"host_permissions": [
  "https://undistractedme.sarojbelbase.com.np/*",  // Vercel backend
  "https://api.spotify.com/*",
  "https://accounts.spotify.com/*",
  "https://nepalipaisa.com/*",                     // NEPSE company list
  "https://www.merolagani.com/*",                  // NEPSE chart data
  "https://people.googleapis.com/*",               // Contacts API
  "https://www.googleapis.com/*",                  // Drive + other Google APIs
  "https://tasks.googleapis.com/*",                // Google Tasks API
  "https://oauth2.googleapis.com/*",               // Token exchange
  "https://suggestqueries.google.com/*",           // Focus Mode search autocomplete
  "https://ac.duckduckgo.com/*",                   // Focus Mode search autocomplete
  "https://api.open-meteo.com/*",                  // Weather data (no API key)
  "https://geocoding-api.open-meteo.com/*",        // Weather manual location search
  "https://nominatim.openstreetmap.org/*",         // Reverse-geocode city name
  "https://ipapi.co/*",                            // IP geolocation (web mode only)
  "https://freeipapi.com/*"                        // IP geolocation (extension mode)
]
```
Content scripts: `src/utilities/media.js` injected into **SoundCloud only** (`*://*.soundcloud.com/*`).
`scripting` permission: `bg.js` uses `chrome.scripting.executeScript` to inject media.js into SoundCloud tabs already open when extension installs.
`oauth2` section present for Chrome identity scopes.
Firefox-specific: `scripts/patch-manifest-firefox.mjs` strips `favicon` + `scripting` permissions on Firefox build.

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

### localStorage (via `STORAGE_KEYS` constants in `src/constants/storageKeys.js`)
| Key (constant) | Key string | Contents |
|---|---|---|
| `SETTINGS` | `undistracted_settings` | Zustand: language, accent, mode, defaultView, dateFormat, clockFormat, lookAwayEnabled, lookAwayInterval, lookAwayNotify |
| `WIDGET_INSTANCES` | `widget_instances` | Zustand: `[{ id, type }]` |
| `widgetSettings(id)` | `widgetSettings_${id}` | Per-widget settings |
| `WIDGET_LAYOUT` | `widget_grid_layouts` | `{ lg: [...], md: [...], ... }` per-breakpoint |
| `EVENTS` | `widget_events` | Events array `[{ id, title, startDate, startTime, endDate, endTime }]` |
| `COUNTDOWN_EVENTS` | `countdown_events` | Countdown widget's own event list |
| `countdownPinned(id)` | `countdown_pinned_${id}` | Per-instance pinned countdown event |
| `COUNTDOWN_NOTIFIED` | `cd_notified` | `{ [eventId]: 'YYYY-MM-DD' }` — per-day dedup; old dates pruned on read |
| `POMODORO` | `fm_pomodoro` | `{ running, remaining, total, preset }` written ONLY while timer is running |
| `pomodoroTimerState(id)` | `pomodoro_timer_state_${id}` | Full per-instance timer state incl. `endTime` for recovery on tab restore |
| `LOCATION_STATE` | `location_state` | Zustand persist for useLocationStore (`{ lat, lon, city, timezone, source, sunrise, sunset, isDay, status, lastUpdated }`) |
| `UNSPLASH_CACHE` | `fm_unsplash_cache` | `[{ id, url, regular, color, author, ... }]` max 10 items |
| `FOCUS_TIMEZONES` | `fm_world_clocks` | Legacy key — defined in STORAGE_KEYS but not actively used; RightZone reads from Zustand directly |
| — | `fm_bg_source` | `'default' \| 'curated' \| 'custom' \| 'orb'` |
| — | `fm_custom_bg_url` | Custom background image URL |
| — | `gcal_has_cache` | Boolean flag `'1'` — GCal events cache exists in chrome.storage.local |
| — | `gcal_synced_at` | Timestamp of last Google Calendar sync |
| `GCAL_ACCESS_TOKEN` | `gcal_access_token` | Unused legacy constant (never written by current code) |
| `contacts_birthdays_synced_at` | — | Timestamp of last Google Contacts sync |
| `contacts_has_cache` | — | Boolean flag — contacts cache exists in chrome.storage.local |
| `contacts_disconnected` | — | Flag set when user disconnects Google Contacts |
| `manual_birthdays` | — | `[{ id, name, type, month, day }]` manual occasion entries |
| `AUTO_THEME_COORDS` | `auto_theme_coords` | Legacy coords; superseded by `location_state` |
| `AUTO_THEME_COORDS_SOURCE` | `auto_theme_coords_source` | Legacy source flag; superseded by `location_state` |

### chrome.storage.local
| Key (constant) | Key string | Contents |
|---|---|---|
| `SPOTIFY_TOKENS` | `spotify_tokens` | `{ access_token, refresh_token, expires_at }` — Spotify OAuth tokens |
| `SPOTIFY_PROFILE` | `spotify_profile` | Cached Spotify user profile `{ name, avatar }` |
| `GCAL_CACHE` | `gcal_events_cache` | Cached Google Calendar events (PII; migrated from localStorage) |
| `GCAL_PROFILE_CACHE` | `gcal_profile_cache` | Cached Google user profile (migrated from localStorage) |
| — | `contacts_birthdays_cache` | `[{ id, name, type, month, day }]` from Google People API |
| — | `google_ff_tokens` | Firefox Google OAuth tokens |
| — | `lookaway_due` | Timestamp when LookAway break is due (written by SW) |
| — | `lookaway_notify` | Boolean — whether to fire OS notification on break |

### sessionStorage
| Key | Contents |
|---|---|
| `google_web_tokens` | Web-mode Google OAuth tokens `{ access_token, refresh_token, expires_at }` — session-scoped, JS-accessible |

### Other localStorage keys (not in STORAGE_KEYS constants)
| Key | Contents |
|---|---|
| `fm_search_history` | Last 12 Focus Mode search queries (array of strings) |

## Event Shape
`{ id, title, startDate, startTime, endDate, endTime }` — dates `YYYY-MM-DD`, times `HH:MM` 24h

## ENV Variables
| Variable | Used by |
|---|---|
| `VITE_PHOTOS_API_URL` | Curated photos proxy URL (default: production Vercel URL) |
| `VITE_PHOTOS_API_KEY` | Shared secret for curated photos Vercel endpoint |
| `VITE_API_KEY` | Shared secret sent as `X-Api-Key` header to Vercel API endpoints |
| `VITE_GOOGLE_DESKTOP_CLIENT_ID` | Firefox/web Google OAuth client ID (XOR-encoded at build by `obscureEnvKeys` plugin) |
| `VITE_GOOGLE_DESKTOP_CLIENT_SECRET` | Firefox/web Google OAuth client secret (XOR-encoded at build) |
| `VITE_WEBSITE_MODE` | Set to `'true'` for Vercel web deployment (disables extension-only features) |
| `GOOGLE_CLIENT_ID` | Server-side Google OAuth client ID (Vercel env var, not bundled) |
| `GOOGLE_CLIENT_SECRET` | Server-side Google OAuth client secret (Vercel env var, never in bundle) |
| `API_KEY` | Server-side key for `api/_config.js` `assertApiKey()` (same value as VITE_API_KEY) |
| `PHOTOS_API_KEY` | Server-side key for `api/photos/curated.js` |
| `BLOB_READ_WRITE_TOKEN` | Auto-injected by Vercel for Blob store access |

> Weather uses **Open-Meteo** (free, no API key required). `VITE_OWM_API_KEY` is no longer used.

## Key Patterns & Gotchas
- **Events double-add bug**: NEVER mutate state inside `setX(prev => ...)` when calling `dispatchEvent` — StrictMode calls updaters twice. Use module-level cache + direct mutation.
- **Modal portals**: MUST use `createPortal(…, document.body)` — CSS `transform` in react-grid-layout breaks `position:fixed` stacking context
- **Cross-widget sync**: `window.dispatchEvent(new Event('widget_events_changed'))` same-page; `storage` event cross-tab
- **Per-breakpoint layout**: save `allLayouts` (2nd arg of `onLayoutChange`), not `currentLayout`
- **Drag stopPropagation**: `onMouseDown={e => e.stopPropagation()}` on buttons inside widgets
- **Spotify re-auth loop**: refresh token failure must NOT clear `chrome.storage.local` tokens. Only `disconnectSpotify()` wipes them. `not_authenticated` in fetchPlayback → `setTrack(null)`, NOT `setConnected(false)`
- **Focus Mode zone z-index**: CenterZone z25 sits ABOVE the foreground photo overlay at z15. Clock is not behind the image anymore.
- **LookAway stale break**: skip if page was hidden (laptop asleep) for most of the interval — `lastHiddenAt` tracked via `document.visibilitychange`
- **Token security**: Spotify tokens + Google Calendar/Contacts cache stored in `chrome.storage.local`, not `localStorage` — prevents other extensions from reading them
- **Key obfuscation**: `obscureEnvKeys` Vite plugin XOR-encodes `VITE_GOOGLE_DESKTOP_CLIENT_ID` / `SECRET` so they never appear as plain text in the JS bundle
- **Widget settings**: `useWidgetSettings` is backed by Zustand `useWidgetInstancesStore.widgetSettings` — do NOT read `widgetSettings_${id}` from localStorage directly in new code; call `useWidgetSettings(id)` instead
- **Shared clock**: use `onClockTick(fn)` from `sharedClock.js` instead of per-component `setInterval(fn, 1000)` — only one tab runs the real timer
- **`useGoogleAccountStore.connect()`**: call this to trigger interactive Google OAuth — do NOT call `getGoogleAuthToken(true)` from UI components directly
- **`mode='auto'`**: `setMode('auto')` does NOT call `applyTheme` directly — `useAutoTheme` does it after mount once sunrise/sunset is resolved

## Data (`src/data/`)
- `bikramSambatCalendar.js` — BS calendar data (used by Nepali date conversion utilities)
- `facts.js` — daily facts pool for the Facts widget
- `greetings.js` — time-aware greeting messages for Focus Mode BottomZone
- `lookawayMessages.js` — 70+ message pool for LookAway overlay (by category)
- `timezones.js` — timezone list for world clock picker in clock widget settings
- `weatherQuips.js` — condition-based quip strings imported by weather Widget.jsx

## Commands
- `bun run dev` — Vite dev server
- `bun run build` — extension build (outputs to `dist/`)
- `bun run test` — Playwright E2E tests
- `bun run test:unit` — Vitest unit tests

