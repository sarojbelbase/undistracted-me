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

### Widgets
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
- [x] **Pomodoro** — pick timer → countdown; syncs state to `fm_pomodoro` localStorage for Focus Mode
- [x] **Spotify** — PKCE OAuth, album art color extraction, 5s polling; fixed re-auth loop (refresh failure keeps tokens, not_authenticated → track=null not connected=false)
- [x] **Stock (NEPSE)** — merolagani.com API, single/multi symbol, sparkline, OHL row

### Theme & Design
- [x] Global theme system: `useTheme` + `applyTheme`, light/dark modes, 11 accent colors
- [x] `"Default"` accent locked/disabled in dark mode, auto-switches to Blueberry
- [x] `clockFormat` setting (`24h`/`12h`) in `useSettingsStore`, shown in Focus Mode settings

### Drag UX
- [x] `draggableHandle` on 3-dot pill notch — only the handle triggers drag, not full widget
- [x] Options button hidden during drag; no scale/transform during drag

### Accessibility
- [x] BaseWidget: `aria-label`, `aria-haspopup`, `aria-expanded`, `role="menu"`, `role="menuitem"`
- [x] BaseSettingsModal: `role="dialog"`, `aria-modal`, `aria-label` on close
- [x] Global `button:focus-visible` ring using `var(--w-accent)`

### Focus Mode (complete redesign)
- [x] **Cinematic text-behind-image clock** — clock digits at z10, foreground depth overlay at z15 makes scenery appear in front of digits
- [x] **Unsplash backgrounds** — `src/utilities/unsplash.js`: 12 curated queries, 6-item localStorage cache, 45-min rotation, 2.5s crossfade, `getCachedPhotoSync` for instant first render
- [x] **Top bar**: Weather badge (icon + temp) · Date — centered between Canvas ← and controls
- [x] **Left panel** (vertically centered): Pomodoro card (26px timer + drain bar), Event card (active/upcoming), Stocks card (symbol + price + ↑↓%)
- [x] **Right panel**: Spotify card — album art, progress bar, prev/play/next controls, local 1s tick
- [x] **Focus Mode settings**: 24h/12h clock toggle, CE/BS date format, appearance, accent, language, "New Photo" button
- [x] **Photo attribution**: bottom-right, links to Unsplash with UTM params
- [x] Fullscreen mode (Wake Lock API — keeps screen on)
- [x] Auto-hide UI after 3s idle in fullscreen; shows on mouse move

### Stock Widget
- [x] Switched from nepalipaisa.com to merolagani.com API
- [x] Single clean fetch — 90-day daily OHLCV, LTP + prevClose + sparkline from same response
- [x] O/H/L always visible in single-stock view (flex-wrap, never clips)
- [x] Multi-symbol: 2-line rows (symbol above, price below) — no truncation

---

## 🚧 Up Next

### Short Term
- [ ] **Unsplash host_permissions**: add `https://api.unsplash.com/*` to `manifest.json` for production builds
- [ ] **Stock widget**: show volume (V) alongside O/H/L in single-stock view
- [ ] **Stock widget**: loading skeleton / shimmer state instead of dead sparkline
- [ ] **Weather**: better error states and manual refresh button
- [ ] **Focus Mode**: persist left/right panel visibility preferences (hide if user doesn't use certain widgets)

### Medium Term
- [ ] **Onboarding**: first-run flow — widget picker, API key prompts for Weather + Unsplash
- [ ] **Build optimization**: manifest permissions audit, bundle size (~537KB gzipped is large), Firefox packaging
- [ ] **Unsplash prewarm**: call `prewarmPhotos()` on extension install/update so first Focus Mode open is instant

### Later
- [ ] **Dynamic quotes widget** — rotating quotes (static JSON or API)
- [ ] **Language localization** — i18n for all widget content
- [ ] **Firefox packaging** — web-ext tooling, MV3 compatibility audit
- [ ] **Focus Mode**: Day Progress dots visible somewhere (subtle, ambient)

- [x] Design system: `--w-ink-*` tokens + typography classes in `App.css`
- [x] BaseWidget: 3-dot options menu, settings popover, forwardRef, click-outside
- [x] BaseSettingsModal: shared dialog shell with `role="dialog"`, `aria-modal`
- [x] useWidgetInstances: add/remove widget instances dynamically
- [x] WidgetCatalog: categorized widget picker drawer
- [x] settingsIO: import/export widget settings

### Widgets
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
- [x] **Pomodoro** — pick timer → SVG ring countdown, Play/Pause/Reset
- [x] **Spotify** — PKCE OAuth, album art color extraction, 5s polling
- [x] **Stock (NEPSE)** — merolagani.com API, single/multi symbol, sparkline, OHL row

### Theme & Design
- [x] Global theme system: `useTheme` + `applyTheme`, light/dark modes, 11 accent colors
- [x] `"Default"` accent locked/disabled in dark mode, auto-switches to Blueberry
- [x] Accent tints: `w-title-bold`, `w-sub-bold`, timeline bars, countdown number all use `var(--w-accent)`
- [x] Keyboard focus-visible ring (global, all interactive elements)

### Drag UX
- [x] `draggableHandle` on 3-dot pill notch — only the handle triggers drag, not full widget
- [x] Options button hidden during drag (`opacity: 0`)
- [x] No scale/transform during drag — widget stays same size
- [x] Ghost notch during drag (`opacity: 0.35`)

### Accessibility
- [x] BaseWidget: `aria-label`, `aria-haspopup`, `aria-expanded`, `role="menu"`, `role="menuitem"`
- [x] BaseSettingsModal: `role="dialog"`, `aria-modal`, `aria-label` on close
- [x] Notes: aria-labels on eye/expand/collapse buttons
- [x] Global `button:focus-visible` ring using `var(--w-accent)`

### Stock Widget
- [x] Switched from nepalipaisa.com to merolagani.com API
- [x] Single clean fetch — no caching hacks, no dual-fetch strategy
- [x] 90-day daily OHLCV — LTP, prevClose, sparkline all from same response
- [x] O/H/L always visible in single-stock view (flex-wrap, never clips)
- [x] Multi-symbol: 2-line rows (symbol above, price below) — no truncation
- [x] Added `fmtVolume` helper (compact: 1.2B, 50.3M, 450K)

---

## 🚧 Up Next

### Short Term
- [ ] **Stock widget**: show volume (V) alongside O/H/L in single-stock view
- [ ] **Stock widget**: loading skeleton / shimmer state instead of dead sparkline
- [ ] **Clock widget**: settings UI for adding/removing extra timezones
- [ ] **Weather**: better error states and manual refresh button

### Medium Term
- [ ] **Screensaver mode**: full-screen clock with bg.webp, auto-hide controls, BS/Gregorian date toggle, Esc to exit
  - Was implemented in commit `81d212f` but reverted due to clock size regression in widget area
  - Should be re-implemented as a **separate route/component** that doesn't share font sizes with the clock widget
- [ ] **Onboarding**: first-run flow — widget picker, API key prompt for weather
- [ ] **Build optimization**: manifest permissions audit, bundle size, Firefox packaging

### Later
- [ ] **Dynamic quotes widget** — rotating quotes (static JSON or API)
- [ ] **Zustand migration** — replace complex useState/localStorage with global store
- [ ] **Language localization** — i18n for all widget content
- [ ] **Firefox packaging** — web-ext tooling, MV3 compatibility audit

