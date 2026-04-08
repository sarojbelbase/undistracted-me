# Undistracted Me — Roadmap & TODOs

## ✅ Done

### Core Architecture
- [x] Widget grid: drag, per-breakpoint layout persistence, dot-grid overlay
- [x] Design system: `--w-ink-*` tokens + typography classes in `App.css`
- [x] BaseWidget: 3-dot options menu, settings popover, forwardRef, click-outside
- [x] BaseSettingsModal: shared dialog shell with `role="dialog"`, `aria-modal`
- [x] **Zustand migration**: `useSettingsStore` + `useWidgetInstancesStore` with `persist` middleware
- [x] useWidgetInstances: add/remove widget instances dynamically
- [x] WidgetCatalog: categorized widget picker drawer
- [x] settingsIO: import/export widget settings
- [x] Keyboard shortcut: Alt+Shift+F to toggle Focus Mode

### Widgets (15 total)
- [x] **Clock** — 24h/12h, time-aware greetings, extra timezone rows, AM/PM inline
- [x] **Date Today** — weekday + BS/AD date
- [x] **Day Progress** — 24-dot grid
- [x] **Events** — localStorage, Google Calendar sync, create/delete, createPortal modals, Today/Tomorrow/Custom chips
- [x] **Countdown** — nearest future event from shared events
- [x] **Calendar** — BS/AD toggle, event dots + tooltip, today = accent cell
- [x] **Weather** — OWM API, geolocation, °C/°F toggle
- [x] **Facts** — daily interesting fact
- [x] **Notes** — textarea, localStorage, color picker (WCAG contrast auto-detection), hide/expand/collapse
- [x] **Bookmarks** — Google Favicon API, chrome.topSites + manual Pinned, AddModal
- [x] **Quick Access** — top 6 chrome.topSites dock: favicon tiles, color extraction, letter fallback, hover scale
- [x] **Pomodoro** — pick timer → countdown; syncs state to `fm_pomodoro` localStorage for Focus Mode
- [x] **Spotify** — PKCE OAuth, album art color extraction, 5s polling; fixed re-auth loop; multi-player (ChromeMediaStrip for YouTube/SoundCloud/etc. via getChromeMedia/sendChromeMediaAction)
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

### Focus Mode (complete redesign)
- [x] **Cinematic text-behind-image clock** — clock digits at z10, foreground depth overlay at z15
- [x] **Background Modal**: 4 modes — default (bundled image), curated (Unsplash library), custom (URL), orb (animated CSS orb with 7 color palettes)
- [x] **Unsplash photo library** — 10-item library, rotate/download/delete/jump, served via Vercel Blob proxy (`/api/photos/curated`), `X-API-Key` auth
- [x] **Top bar**: Weather badge (icon + temp + date) — centered; controls auto-hide in fullscreen
- [x] **Left panel** (vertically centered): Pomodoro card (26px timer + drain bar), Event card (active/upcoming), Stocks card (symbol + price + ↑↓%)
- [x] **Right panel**: Spotify card — album art, progress bar, prev/play/next controls, local 1s tick
- [x] **World Clocks Panel** — ambient right-side panel reads clock widget timezone settings, 1s interval, staggered entrance animation
- [x] **Focus Mode settings**: clock format, BS/CE date, "Change Background" → BackgroundModal
- [x] **useCenterOnDark**: Canvas pixel-sample detects dark/light photo → adapts clock shadow style
- [x] Fullscreen mode (Wake Lock API — keeps screen on)
- [x] Auto-hide UI after 3s idle in fullscreen; shows on mouse move

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

### Google Auth & Security
- [x] **Unified Google OAuth** (`googleAuth.js`) — Chrome (getAuthToken), Firefox (PKCE launchWebAuthFlow), Web (popup + PKCE + server-side `/api/auth/google/token`)
- [x] **Google Contacts** (`googleContacts.js`) — People API, paginated (up to 2000 contacts), birthdays + anniversaries
- [x] **Tokens in chrome.storage.local** — Spotify tokens + Contacts cache migrated from localStorage (security)
- [x] **obscureEnvKeys** Vite plugin — XOR-encodes VITE_GOOGLE_DESKTOP_CLIENT_ID/SECRET at build time
- [x] **Vercel API** — `api/photos/curated.js` (Blob store), `api/auth/google/token.js` (OAuth exchange), `api/favicon.js`

### Service Worker (`bg.js`)
- [x] Badge update on install/startup with Nepali date
- [x] Event reminders — notification 5 min before upcoming events
- [x] Pomodoro done notification
- [x] LookAway alarm handler (`UM_LOOKAWAY`)

### Media Session
- [x] `src/media-cs.js` + `src/utilities/media.js` content scripts — detect playback on any tab via `navigator.mediaSession` + `<audio>/<video>` fallback
- [x] Spotify widget: `ChromeMediaStrip` — stacked player for non-active browser sessions (YouTube, SoundCloud, Apple Music, etc.)

---

## 🚧 Up Next

### Short Term
- [ ] **Stock widget**: show volume (V) alongside O/H/L in single-stock view
- [ ] **Stock widget**: loading skeleton / shimmer state instead of dead sparkline on first render
- [ ] **Weather**: better error states and manual refresh button
- [ ] **Focus Mode**: persist left/right panel visibility preferences (hide if user doesn't use certain widgets)
- [ ] **LookAway**: snooze button (dismiss for N minutes without resetting the schedule)

### Medium Term
- [ ] **Onboarding**: first-run flow — widget picker, API key prompts for Weather
- [ ] **Build optimization**: bundle size audit (~537KB gzipped is large), Firefox packaging
- [ ] **Unsplash prewarm**: call `downloadCuratedPhotos()` on extension install/update so first Focus Mode open is instant
- [ ] **Occasions widget**: show "today" screen — full-card celebration when it's someone's birthday today

### Later / Ideas
- [ ] **Dynamic quotes widget** — rotating quotes (static JSON or API)
- [ ] **Language localization** — i18n for all widget content beyond Nepali date
- [ ] **Firefox packaging** — web-ext tooling, MV3 compatibility audit
- [ ] **Focus Mode**: Day Progress dots visible somewhere (subtle, ambient)


