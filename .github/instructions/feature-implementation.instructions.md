---
description: "Implementation guide for the 6 planned features: cross-device sync, YouTube Watch Later, OPML import, website blocker, enriched Pomodoro, expense tracker. Covers architecture decisions, file structure, shared component reuse, Karpathy principles, and React Guru patterns."
applyTo: "src/widgets/**,src/utilities/**,src/store/**,src/components/**,src/bg.js,public/**"
---

# Feature Implementation Guidelines

> Derived from: `/memories/session/implementation-plan.md` (full case studies)
> Load the session memory file for detailed UI mockups and technical specs.

---

## 1. Universal Rules (Every Feature)

### Components: Reuse, Don't Rebuild
- **Toggles/options** → `PillButton` (`src/components/ui/PillButton.jsx`)
- **Mutually exclusive choices** → `SegmentedControl`
- **Destructive actions** → `ConfirmButton` (two-click confirm pattern)
- **Dropdowns/popovers** → `Popup`
- **Status badges** → `TintedChip`
- **Radio lists** → `RadioGroup` (only when PillButton doesn't fit)

### Card Wrapper: BaseWidget Always
Every widget uses `BaseWidget` from `src/widgets/BaseWidget.jsx`. It provides:
- Forwarded ref (for ResizeObserver)
- Three-dots menu + settings modal portal
- Card styling via `--card-*` CSS vars (flat, glass, soft, outlined, comic)
- `aria-label`, `aria-haspopup`, `aria-expanded`

### State: Zustand Selector Pattern
```js
// Two-step selector — prevents re-renders from unrelated store mutations
const instId = useWidgetInstancesStore(
  useShallow((s) => s.instances.find(i => i.type === 'mytype')?.id ?? 'mytype')
);
const settings = useWidgetInstancesStore(
  useShallow((s) => s.widgetSettings[instId] ?? null)
);
```

### Auth: GoogleAccountStore
All Google API features share `useGoogleAccountStore`:
- Token via `getGoogleAuthToken()` (already unified for Chrome/Firefox/Web)
- Profile from `getGoogleUserProfile()`
- Listen to `google_account_changed` custom event for reactive auth state

### Data: localStorage Patterns
- **initRef for mount reads:** `useRef(undefined)` → read once like `useFocusPhoto` and Pomodoro Widget
- **Per-widget settings:** `widgetSettings_${id}` key (mirrored to Zustand `widgetSettings` map)
- **Large collections:** Cap items (RSS does 30 max), trim oldest when exceeding max

### Clock: sharedClock
- If widget needs per-second ticks → `onClockTick(fn)` from `src/utilities/sharedClock.js`
- Returns unsubscribe function — perfect for useEffect cleanup
- Never run your own `setInterval` for per-second updates

---

## 2. Feature-Specific Rules

### Cross-Device Sync (`chrome.storage.sync`)
- **Sync engine:** `src/utilities/syncEngine.js` — single source of truth
- **Strategy:** Last-write-wins with per-key timestamps
- **What syncs:** Settings, widget instances, events, bookmarks, RSS feed URLs, Pomodoro history
- **What does NOT sync:** Weather cache, Unsplash photos, RSS items, location state, auth tokens
- **Zustand integration:** Add sync push to `onRehydrateStorage` callback in persist config
- **Conflict UI:** `SyncConflictBanner.jsx` — non-blocking banner, never a modal dialog
- **Limit awareness:** 100KB total, 8KB/item, ~1 write/sec. Debounce writes 500ms.

### Expense Tracker Widget
- **Data model:** `{ id, amount, currency, category, note, createdAt }` — stored as JSON array in `widgetSettings_${id}.expenses`
- **Currency:** Curated list of ~50 world currencies in `src/data/currencies.js`. Format via `Intl.NumberFormat` (native, no deps).
- **Hook:** `src/widgets/expense/useExpenses.js` — CRUD + weekly summary. Cap 500 entries, auto-trim oldest.
- **Quick-add:** Amount input + category Popup + add button. 3-second logging flow.
- **Categories:** Default set (Food 🍔, Transport 🚌, Shopping 🛍, Entertainment 🎬, Health 💊, Education 📚, Bills 💡, Other 💰). Custom categories in settings.
- **Weekly summary:** CSS-only horizontal bars per category. No Chart.js.
- **Export:** CSV and JSON via `URL.createObjectURL` + `<a download>` in settings. No server needed.
- **Icons:** Emoji for categories (zero SVG burden). `WalletFill` for widget icon.

### YouTube Watch Later Widget
- **Scope:** `youtube.readonly` — read Watch Later playlist
- **Playlist ID:** Always `WL` for authenticated user
- **API:** `GET https://www.googleapis.com/youtube/v3/playlistItems?playlistId=WL`
- **Thumbnails:** Use `snippet.thumbnails.medium.url` (320×180) — scaled to 120×68 in CSS
- **Hook:** `src/widgets/youtube/useWatchLater.js` — fetch every 30 min

### OPML Import (RSS Enhancement)
- **Parser:** `src/widgets/rss/opmlParser.js` — uses `DOMParser` (native, zero deps)
- **Import flow:** File picker OR paste text → parse → preview → confirm → merge
- **Merge:** Skip feeds whose URL already exists. Deduplicate within OPML.
- **UI:** Inline panel inside RSS settings (NOT a separate modal). Checkboxes for each feed.
- **Edge cases:** Empty OPML, nested folders (flatten), invalid URLs (flag with ⚠️)

### Website Blocker
- **Engine:** `src/utilities/siteBlocker.js` — CRUD + `chrome.declarativeNetRequest` dynamic rules
- **Rule IDs:** Start at 1000 (avoid collisions). Map rule ID → domain in storage.
- **Blocked page:** `public/blocked.html` — static page, matches Undistracted Me aesthetic
- **Popup integration:** Add "Block [domain]" to `CurrentTabBookmark.jsx`
- **Settings:** New `BlockedSites.jsx` section — list + add input + import/export
- **Permission:** `declarativeNetRequest` in manifest.json
- **Never block:** `chrome://`, `chrome-extension://`, the extension's own new-tab page

### Enriched Pomodoro
- **Progress ring:** `ProgressRing.jsx` — SVG circle with `stroke-dasharray` animation
  - Consider making it a shared component: `src/components/ui/ProgressRing.jsx`
  - Reusable for Countdown widget, LookAway timer
- **Sound:** Add `public/sounds/chime.mp3` — play on timer end via existing audio pattern
- **History:** `usePomodoroHistory.js` — localStorage, max 500 sessions, trim oldest
- **Stats:** Streak (consecutive days), today's minutes, weekly bar chart (CSS-only)
- **Break messages:** Reuse `src/data/lookawayMessages.js` — one source for break content
- **Rain sounds:** Reuse `api/audio/rain.js` — already implemented, just add toggle

---

## 3. Karpathy Principles (Mandatory)
1. **Start simple.** Phase 1 is always the minimal viable slice. No over-engineering.
2. **Native APIs over dependencies.** `DOMParser`, `chrome.storage.sync`, `chrome.declarativeNetRequest`, `fetch`. No new npm packages.
3. **Reuse before rebuild.** Every feature reuses existing stores, hooks, BaseWidget, PillButton, ConfirmButton, sharedClock.
4. **Data model before UI.** Define data shapes (sync wrapper, OPML outline, blocked site) before JSX.
5. **Test happy path first.** Parsing, merging, blocking logic — testable without browser/React. UI tests come after.

---

## 4. Contrast & Accessibility (From widget-design.instructions.md)
- **Glass surfaces over dark overlays:** Bump text up one ink level. Dividers → `rgba(0,0,0,0.1)`.
- **Never hardcode colors.** Always use `var(--w-ink-N)` or `var(--w-accent)`.
- **Focus rings:** Global `button:focus-visible` uses `var(--w-accent)`. Don't override.
- **All modals:** `role="dialog"`, `aria-modal`, `aria-label` on close button. Use `BaseSettingsModal`.
- **All widgets:** `aria-label` on the widget wrapper, `aria-haspopup` + `aria-expanded` on menu button.

---

## 5. File Naming & Organization
- New widgets: `src/widgets/<name>/config.js`, `Widget.jsx`, `Settings.jsx`, `use<Thing>.js`
- New utilities: `src/utilities/<name>.js`
- Shared hooks (used by >1 widget): `src/hooks/use<Thing>.js` or co-located in a widget if primarily that widget's domain
- New shared UI: `src/components/ui/<Name>.jsx`
- New settings sections: `src/components/settings/<Name>.jsx`
- Widget registration: Always add to `WIDGET_REGISTRY` in `src/widgets/index.js`

---

## 6. Build Considerations
- New Google scopes → add to `src/utilities/googleAuth.js` scope list (`youtube.readonly` for YouTube)
- New data files → add to `src/data/` (e.g. `currencies.js` for Expense Tracker)
- New permissions → add to `public/manifest.json`
- New static pages → add to `vite.config.ts` build input
- New sounds → add to `public/sounds/`
- Firefox compatibility → `declarativeNetRequest` is supported in Firefox MV3
