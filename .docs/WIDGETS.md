# Undistracted Me — Widgets Reference

Complete reference for every widget and the shared widget infrastructure.

---

## Table of Contents

1. [Shared Infrastructure](#shared-infrastructure)
   - [BaseWidget](#basewidget)
   - [BaseSettingsModal](#basesettingsmodal)
   - [WidgetGrid](#widgetgrid)
   - [WidgetCatalog](#widgetcatalog)
   - [useWidgetSettings](#usewidgetsettings)
   - [settingsIO](#settingsio)
   - [useEvents (re-export)](#useevents-re-export)
   - [WIDGET_REGISTRY & WIDGET_TYPES](#widget_registry--widget_types)
2. [Widget Catalog](#widget-catalog-1)
   - [Clock](#clock)
   - [Date Today](#date-today)
   - [Progress (Day/Week/Month/Year)](#progress-dayweekmonthyear)
   - [Countdown](#countdown)
   - [Events](#events)
   - [Calendar](#calendar)
   - [Weather](#weather)
   - [Notes](#notes)
   - [Bookmarks](#bookmarks)
   - [Quick Access](#quick-access)
   - [Pomodoro](#pomodoro)
   - [Media (Spotify + Browser)](#media-spotify--browser)
   - [Stock (NEPSE)](#stock-nepse)
   - [Occasions (Birthdays)](#occasions-birthdays)
   - [Dailys](#dailys)
   - [RSS / News Feed](#rss--news-feed)
   - [Timer (stub)](#timer-stub)
3. [Config Shape Reference](#config-shape-reference)
4. [Widget Type ↔ Storage Key Map](#widget-type--storage-key-map)
5. [Cross-cutting Patterns](#cross-cutting-patterns)

---

## Shared Infrastructure

### BaseWidget

**File:** `src/widgets/BaseWidget.jsx`

The root card wrapper rendered around every widget. Uses `forwardRef` so `WidgetGrid` can attach a `ResizeObserver`.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `settingsContent` | `JSX \| (onClose) => JSX \| null` | When provided, a ⋯ button appears on hover. Passing a function gives the inner content access to `onClose` (e.g. the stock symbol picker closes itself on selection). |
| `settingsTitle` | `string` | Title shown in the settings modal header. Defaults to `"Settings"`. |
| `onRemove` | `() => void \| null` | When provided, a "Remove" item appears in the dropdown. Wrapped in `ConfirmButton` to require a second click. |
| `modalWidth` | `string` | Tailwind width class for the settings modal, e.g. `"w-80"` (default) or `"w-96"`. |
| `cardStyle` | `object` | Extra inline styles merged onto the inner card `<div>`. Used by Bookmarks to set a dynamic album-extracted background colour. |
| `className` | `string` | Extra classes on the inner card. |

**Key implementation details:**

- **Context menu** is rendered as a **portal** (`createPortal → document.body`) to escape the grid-item `transform`. Position is computed in `useLayoutEffect` using bounding-rect arithmetic to flip above/below and left/right at viewport edges.
- **3-dot button** is positioned at `top: -14, right: -14` (outside the card) and is invisible by default; it fades in on `group-hover` via Tailwind.
- **Keyboard**: Escape closes the dropdown; focus returns to the button.
- The settings modal is rendered inline (not portalled) because it uses `position: fixed` internally via `Modal`.

---

### BaseSettingsModal

**File:** `src/widgets/BaseSettingsModal.jsx`

A thin wrapper around the shared `Modal` UI component. All settings panels are passed as `children`.

```src/widgets/BaseSettingsModal.jsx#L1-5
import { Modal } from '../components/ui/Modal';

export const BaseSettingsModal = ({ title = 'Settings', onClose, children, width = 'w-80' }) => (
  <Modal title={title} onClose={onClose} className={width}>
    {children}
  </Modal>
);
```

---

### WidgetGrid

**File:** `src/widgets/WidgetGrid.jsx`

Hosts all widget instances using `react-grid-layout`'s `<Responsive>` grid.

**Key implementation details:**

- **Breakpoints**: 5 tiers — `lg` (≥1200, 48 cols), `md` (≥996, 40 cols), `sm` (≥768, 24 cols), `xs` (≥480, 16 cols), `xxs` (≥0, 8 cols). `rowHeight = 8.5 px`.
- **Width quantization** (`quantizeWidth`): Snaps container width to integer column widths at the active breakpoint. Prevents sub-pixel blur at fractional DPRs (e.g. 125% Windows scaling).
- **Layout persistence**: Saved to `localStorage[STORAGE_KEYS.WIDGET_LAYOUT]` on every change. On load, saved layouts are merged with config defaults. Config `h` is enforced as a minimum floor so stale saved layouts cannot make widgets shorter than their content.
- **Arrange mode** (`isDraggable` prop): Passed down from `App`. In arrange mode, a drag-handle pill appears at the top centre of each widget; `pointer-events: none` is set on widget content to prevent accidental interaction.
- **Dot-grid overlay**: A `div` with class `drag-dot-overlay` that fades in at `opacity: 0.5` while dragging or in arrange mode.
- `useCSSTransforms={false}` — uses `top/left` absolute positioning instead of CSS transforms, which avoids the blurriness from sub-pixel `transform: translate()`.
- **Safety net**: `document.addEventListener('mouseup')` clears `draggingId` in case `onDragStop` is never fired (mouse released outside viewport).
- Widget render is self-registering: `renderWidget(id, type, onRemove)` looks up `REG_MAP[type].Component` — no switch/case needed.

---

### WidgetCatalog

**File:** `src/widgets/WidgetCatalog.jsx`

A slide-in drawer panel (portalled to `document.body`) for adding/removing widget instances.

**Key implementation details:**

- **3-phase animation**: `entering → open → leaving`. A double-`requestAnimationFrame` ensures the browser has a real "from" state before the CSS transition fires.
- **Category tabs**: `all | time | planning | info | tools`. In "all" view, widgets are grouped under section headers using `CATEGORY_ORDER`.
- **Stepper UX**: Each widget row shows `[−] count [+]` controls. Clicking `+` calls `onAddInstance(type)`; `−` removes the last instance of that type.
- **Footer**: Shows "+ Add · − Remove from Canvas" hint and a "Buy Me Momo" link. Import/export/reset were migrated to the Data tab in Global Settings.

---

### useWidgetSettings

**File:** `src/widgets/useWidgetSettings.js`

```src/widgets/useWidgetSettings.js#L1-45
// API:
const [settings, updateSetting] = useWidgetSettings('clock', { format: '24h' });
updateSetting('format', '12h');
```

- Reads per-widget settings from `useWidgetInstancesStore` (Zustand), merging stored values over the provided `defaults`.
- Uses `useShallow` so only real changes trigger re-renders.
- Writes via `updateWidgetSetting(widgetId, key, value)` in the store — which also mirrors to `widgetSettings_${id}` in `localStorage` for Playwright test compatibility.
- `widgetId` is the **instance ID** (from `instances[]`), not the type string.

---

### settingsIO

**File:** `src/widgets/settingsIO.js`

Provides three functions used by the **Data tab** in Global Settings:

| Function | Behaviour |
|---|---|
| `exportSettings()` | Serialises all `localStorage` entries to a JSON blob and triggers a browser download named `undistracted-me-YYYY-MM-DD.json`. |
| `importFromFile(onError)` | Opens a file picker, reads the selected `.json`, calls `importSettings()` which clears `localStorage`, restores all keys, then reloads the page. |
| `resetSettings()` | `localStorage.clear()` + `window.location.reload()`. |

The exported JSON wraps everything under `{ undistracted_me: { ...allKeys }, exported_at: ISO }`.

---

### useEvents (re-export)

**File:** `src/widgets/useEvents.js`

```src/widgets/useEvents.js#L1-8
/**
 * @deprecated Import from 'src/hooks/useEvents' instead.
 * This re-export exists so existing `from '../useEvents'` paths keep working.
 */
export {
  useEvents, useGoogleCalendar, useGoogleProfile,
  formatEventTime, eventStartDate,
} from '../hooks/useEvents';
```

The actual implementations live in `src/hooks/useEvents.js`. All widgets that need local events or Google Calendar data import from this path (or `../useEvents` from within the widget folder, which resolves here).

**`useEvents()`** returns `[localEvents, addEvent, removeEvent]` — reads from `useWidgetInstancesStore`.

**`useGoogleCalendar()`** returns `{ gcalEvents, loading, connected, syncedAt, refresh }` — polls Google Calendar and caches results in `chrome.storage.local['gcal_events_cache']`.

---

### WIDGET_REGISTRY & WIDGET_TYPES

**File:** `src/widgets/index.js`

`WIDGET_TYPES` is a frozen enum of type strings, e.g. `WIDGET_TYPES.CLOCK = 'clock'`.

`WIDGET_REGISTRY` is an ordered array of config objects (one per widget). The order controls display order in the WidgetCatalog. Each config object shape is described in [Config Shape Reference](#config-shape-reference).

---

## Widget Catalog

---

### Clock

**Category:** `time` · **Type:** `clock`

**What it does:** Displays the current local time with a time-aware greeting (`Good morning`, `Good afternoon`, etc.). Supports 12h/24h format and up to 2 extra timezone clocks.

**Files:**
```
clock/
  Widget.jsx   — main component
  Settings.jsx — format selector + timezone picker
  config.js    — grid position, icon, type
  utils.js     — getTimeParts, getTimeInZone, formatTime
```

**Key implementation details:**

- Uses `onClockTick(fn)` from `src/utilities/sharedClock.js` (leader-election via Web Locks + BroadcastChannel) for second-aligned updates. This means all widgets share a single tick source with zero drift.
- `getTimeParts(format)` returns `{ time, period, greeting }`. The greeting object has `{ prefix, label }` (e.g. `"Good"`, `"morning"`).
- Extra timezone clocks use `dayjs().tz(ianaStr)` via `getTimeInZone(tz, format)`. Timezones are stored as IANA strings.
- Up to **2 extra clocks** supported. A small dot-counter (●○ / ●● / ○○) shows the slot usage in Settings.
- The timezone picker groups timezones by region (`TZ_REGIONS`) when no search query; falls back to a flat filtered list. Data comes from `src/data/timezones.js`.
- Main clock font size scales with `clamp(3rem, 6vw, 4.25rem)` (shrinks to `4vw` when extra clocks are present).

**Settings:** `format: '24h'|'12h'`, `timezones: string[]` (IANA, max 2).

---

### Date Today

**Category:** `time` · **Type:** `dateToday`

**What it does:** Shows the current date as weekday + month name + large numeric day. Supports both Gregorian (AD) and Bikram Sambat (BS/Nepali) calendars.

**Files:**
```
dateToday/
  Widget.jsx   — main component
  Settings.jsx — calendar toggle
  config.js
  utils.js     — getDateParts(language)
```

**Key implementation details:**

- `getDateParts(language)` returns `{ weekday, month, day, year }`. For BS, it calls `convertEnglishToNepali(y, m, d)` from `src/utilities` (the core Nepali calendar conversion library) and maps the BS month number to `NEPALI_MONTH_NAMES[]`.
- Uses `getTimeZoneAwareDayJsInstance()` to read the current date in the configured timezone.
- Updates via `setInterval(update, 60_000)` (every minute) — not on `onClockTick` since sub-minute updates are unnecessary.
- Day number rendered at `clamp(4rem, 9vw, 7rem)` — the dominant visual element.

**Settings:** `language: 'en'|'ne'` (Gregorian vs. BS).

---

### Progress (Day/Week/Month/Year)

**Category:** `time` · **Type:** `progress`  
**Config file location:** `progress/config.js` (note: the folder is named `progress`, not `dayProgress`)

**What it does:** Shows a 4×6 grid of 24 dots where filled dots represent the percentage of the current period (day, week, month, or year) that has elapsed.

**Files:**
```
progress/
  Widget.jsx   — main component
  Settings.jsx — period + calendar pickers
  config.js
  utils.js     — getProgress, period calculators
```

**dayProgress/** folder only contains a `config.js` re-pointing to the same Widget — it exists as a legacy path but `WIDGET_REGISTRY` uses `progress/config.js`.

**Key implementation details:**

- `getProgress(period, calendar)` returns `{ percentage, filledDots, label, subtitle }`.
- For **month/year** periods in BS mode, it calls the Nepali calendar conversion logic, reads `NEPALI_YEARS_AND_DAYS_IN_MONTHS` for the total days, and computes the ratio from elapsed minutes.
- `bsYearTotals` is pre-computed at module load time (a simple accumulation of the 12-month array) to avoid redundant work on every minute tick.
- Updates tick only when the minute changes: `onClockTick` fires every second, but the inner handler is gated on `m !== lastMinuteRef.current`.
- When `period === 'day'` or `'week'`, the Calendar setting is hidden (irrelevant).

**Settings:** `period: 'day'|'week'|'month'|'year'`, `calendar: 'ad'|'bs'`.

---

### Countdown

**Category:** `time` · **Type:** `countdown`

**What it does:** Shows a single large countdown timer to the next upcoming event. The target is chosen automatically from: pinned custom countdown → pinned calendar event → nearest upcoming event → nearest custom countdown. The settings panel (opened via the ⋯ menu) lets users add custom countdowns and pin a specific one.

**Files:**
```
countdown/
  Widget.jsx       — main component + all logic
  Settings.jsx     — exports null (no settings panel; logic lives inline in Widget)
  AddCountdown.jsx — modal form to create a new custom countdown
  config.js
  utils.js         — getNextOccurrence, formatCountdown, formatTargetDate, REPEAT_OPTIONS
```

**Key implementation details:**

- **Two data sources merge**: custom countdowns (from `STORAGE_KEYS.COUNTDOWN_EVENTS` in `localStorage`) and calendar events (from `useEvents()` + `useGoogleCalendar()`).
- **Pin system**: `STORAGE_KEYS.countdownPinned(id)` stores `{ type: 'custom'|'event', id|eventId }` per widget instance. If the pinned target is in the past (and non-repeating), the pin is auto-cleared.
- **Auto-target resolution** (`resolveTarget`): Complex priority chain — pinned custom → pinned event → nearest event → nearest custom. Falls back to showing the most imminent of either pool.
- **Repeat modes**: `none | weekly | monthly | yearly`. `getNextOccurrence` advances the base date in a `while (next <= now)` loop until the next future occurrence.
- **Notifications**: `sendNotification` (via `notifyUser` from `src/utilities/chrome`) fires once per calendar day per countdown. Keyed in `STORAGE_KEYS.COUNTDOWN_NOTIFIED` (`{ [id]: 'YYYY-MM-DD' }`). Old entries pruned on each write.
- **Live countdown**: Driven by `onClockTick`. Uses a tier system: months → days → hours → minutes display (`monthsTier`, `daysTier`, `hoursTier`, `minsTier`).
- **Title font size** scales with title length via `getTitleFontSize(len)`.
- Custom countdowns created via `AddCountdown.jsx` are stored as `Event` objects with `_fromCountdown: true` flag, so they don't pollute the Events widget.
- `useReducer` with `forceUpdate` is used to trigger re-renders on tick without storing time in state.

**Settings:** None exposed — all configuration (add/remove/pin) happens inside the `CountdownSettings` panel embedded in the ⋯ modal.

**Unusual:** `Settings.jsx` exports `null`, which is unusual among all widgets. The settings UI is instead an inline component `CountdownSettings` inside `Widget.jsx` that gets passed as `settingsContent` to `BaseWidget`.

---

### Events

**Category:** `planning` · **Type:** `events`

**What it does:** Shows upcoming local and Google Calendar events. Displays up to 2 events inline; "View All" opens a full modal. Has a `+` FAB to create a new event.

**Files:**
```
events/
  Widget.jsx        — main component
  Settings.jsx      — Google Calendar integration row
  AddEvent.jsx      — modal form (title + start + optional end/duration)
  AllEventsModal.jsx — grouped Today/Tomorrow/Later view of all events
  config.js
  utils.js          — many helpers (see below)
```

**Key implementation details:**

- Merges `localEvents` (from `useEvents()`) and `gcalEvents` (from `useGoogleCalendar()`). Past events are filtered out using a real-time `now` state updated every 60 seconds.
- **Filtering**: Events without a `startDate` always show; events with only a date (no time) show while `startDate >= today`; timed events show while their end time (or start time if no end) is in the future.
- **Sort**: `aKey = startDate + 'T' + (startTime || '99:99')` — all-day events sort after timed events on the same day.
- `AddEvent.jsx` has quick date chips (Today/Tomorrow/Custom) and duration pills (30 min/1 hr/2 hr/Custom). Duration pills call `applyDuration(startDate, startTime, mins)` to compute `endDate/endTime`.
- `AllEventsModal.jsx` buckets events into Today/Tomorrow/Later using `bucketLabel(dateStr)`. Past events are rendered with reduced opacity.
- `utils.js` is the richest utilities file in the project, exporting ~15 helpers including `datePrefixFor`, `isLiveNow`, `getNextEventToShow`, `getTimeUntilEvent`, and `fmt12`.
- **Sync age label**: `humanizeAge(syncedAt)` is polled every 30 seconds to show "synced X ago".

**Settings:** `Settings.jsx` renders only an `IntegrationRow` pointing to Google Calendar (connect/disconnect handled in `AccountsDialog`).

---

### Calendar

**Category:** `planning` · **Type:** `calendar`

**What it does:** A full monthly calendar view. Supports both Gregorian (AD) and Bikram Sambat (BS) calendars. Event dots appear on days that have events. Clicking a day opens the `AddEvent` modal pre-filled with that date. Month navigation arrows + "Go To Today" chip.

**Files:**
```
calendar/
  Widget.jsx   — main component + DayCell, DayTooltip, AddTooltip
  Settings.jsx — calendar type toggle
  config.js
  utils.js     — buildCalendarData, buildEventDateSet, WEEK_DAYS
```

**Key implementation details:**

- `buildCalendarData(calendarType, monthOffset)` returns `{ label, sublabel, days[], year, month }`. For BS, it manually walks the `NEPALI_YEARS_AND_DAYS_IN_MONTHS` lookup table month by month to find day-1 of the target month, then uses `dayjs` for the `firstOfTarget.day()` (weekday index). Days include `{ date, isCurrent, adDate }` where `adDate` is the Gregorian ISO string used for event matching.
- **`monthOffset`** is intentionally kept in local component state (never persisted) — always resets to 0 on mount.
- **DayCell** hover effect: number fades out and a `+` icon fades in. A `DayTooltip` shows the event list if the day has events; an `AddTooltip` shows "Add new event" always on hover.
- Both tooltips are rendered using the shared `Popup` component (two-phase portal positioning).
- Events are matched by `e.startDate === dateStr` where `dateStr` is the Gregorian ISO date for BS cells or `YYYY-MM-DD` for AD cells.
- `useEvents()` + `useGoogleCalendar()` merged with `useMemo` to avoid recreating the array on every re-render.
- Hourly `setInterval` refreshes the calendar when viewing the current month (to keep the "today" highlight accurate after midnight).

**Settings:** `calendarType: 'bs'|'ad'`.

---

### Weather

**Category:** `info` · **Type:** `weather`

**What it does:** Current conditions + smart forecast from Open-Meteo (free, no API key). Two display modes: **Minimal** (Apple Weather–inspired: icon + condition + hero temperature + city) and **Expressive** (gradient atmosphere animation, temperature block top-left, forecast + quip bottom-right).

**Files:**
```
weather/
  Widget.jsx   — main component + views (MinimalView, ExpressiveView, skeletons)
  Settings.jsx — display style, unit, location search
  config.js
  utils.jsx    — fetchOpenMeteo, parseWeather, parseForecast, icons, cache
```

**Key implementation details:**

- **Data source**: `fetchOpenMeteo(lat, lon, units)` — single call returning current + 12h hourly. No API key needed.
- **Location resolution**: reads `geoLat/geoLon/geoCity/geoSource` from `useLocationStore` (centralized 3-tier pipeline: browser GPS → IP geo → hardcoded Kathmandu default). Manual override stored as `{ name, lat, lon }` in widget settings.
- **Cache**: `readWeatherCache(cacheKey, unit)` / `writeWeatherCache(...)` in `localStorage['weather_cache_v1']`. Cache key includes coords so it naturally invalidates on VPN switch. Fresh if < 30 min old.
- **Forecast logic** (`parseForecast`): 4-case analysis of the next 12h hourly data. Returns `{ description, code, hours, type }` where `type` is one of `'clearing' | 'incoming' | 'persist'`.
- **PrecipBars**: Mini horizontal bar chart (5px bars, height proportional to `pop%`) shown alongside clearing/incoming forecasts. Each bar is an accessible `<button>` with a Popup tooltip.
- **Weather quips**: `getWeatherQuip(forecast, weather, opts)` from `src/data/weatherQuips.js` — returns a witty one-liner based on conditions.
- **WeatherAtmosphere**: Animated canvas/CSS component (`src/components/ui/WeatherAtmosphere.jsx`) shown in Expressive mode. Hoverable area in top-right reveals atmosphere label via Popup.
- Location search in Settings debounces at 350 ms, calls Open-Meteo geocoding API, sorts results by Haversine distance from the user's current location, renders a portalled dropdown.
- Legacy `style === 'simple'` is normalised to `'minimal'` on read.
- `API_KEY = null` exported from `utils.jsx` — kept so lingering imports don't crash.

**Settings:** `location: { name, lat, lon } | null`, `unit: 'metric'|'imperial'`, `style: 'minimal'|'expressive'`.

---

### Notes

**Category:** `planning` · **Type:** `notes`

**What it does:** A sticky-note widget supporting multiple notes (pages), Markdown-like rich text via Lexical editor, and three viewing modes: inline card (widget view), overlay modal, and full-page takeover.

**Files:**
```
notes/
  Widget.jsx        — main component + TrafficLights, SegBtn, CircleBtn, NavDot, nav controls
  LexicalEditor.jsx — full Lexical rich-text editor with markdown transformers
  config.js
```

**Key implementation details:**

- **Storage shape**: `{ notes: string[], idx: number }` stored via `useWidgetSettings`. Migration from old `{ text: string }` shape handled by `resolveSettings()` on load.
- **Note format**: Each note is a Markdown string (plain text). `splitNote(text)` separates the first line (title) from the body. `mergeNote(title, body)` recombines them.
- **Three modes** controlled by local `mode` state: `null` (widget card), `'modal'` (BaseSettingsModal-like overlay), `'page'` (full-screen takeover at `z-index: 9999`).
- **LexicalEditor**: Built on `@lexical/react`. Supports headings (H1–H3), bold, italic, underline, strikethrough, code, blockquote, ordered/unordered lists, check lists, and hyperlinks.
  - Custom `LinkEditorPlugin` — intercepts Cmd+K / right-click on links; shows a floating inline dialog to insert/edit/remove links with text and URL fields.
  - `ValueSyncPlugin` serialises the editor state to Markdown on every change and calls `onChange`. Skips the first mount to avoid overwriting the seeded initial value.
  - `RefPlugin` exposes a `focus()` method via `useImperativeHandle`.
  - Source Serif Pro font is lazy-loaded from `fonts.gstatic.com` on first render.
  - Custom Lexical `theme` maps node types to CSS class names.
- **Auto-save**: `saveTimerRef` is set on changes; actual `updateSetting` call is debounced.
- **TrafficLights** sub-component: macOS-style dot buttons (red → delete note, yellow → widget view, green → page view) with hover tooltips via Popup.
- **Dash separator** is a CSS `backgroundImage` pattern (dashed line) using `repeating-linear-gradient`.

**Settings:** `notes: string[]`, `idx: number`.

---

### Bookmarks

**Category:** `tools` · **Type:** `bookmark`

**What it does:** A single-site bookmark widget. Displays the site's favicon (or a generated letter icon) as a large centred button. Clicking opens the URL in a new tab. An inline settings panel (via both the ⋯ menu and an initial `+` button) lets the user set the URL, display name, and icon style.

**Files:**
```
bookmarks/
  Widget.jsx — main component + BookmarkSettings inline panel
  config.js
  utils.js   — re-exports from src/utilities/favicon.js
```

**Key implementation details:**

- `utils.js` is a **pure re-export** from `src/utilities/favicon.js` for backward compatibility. All real favicon utilities live there.
- **Icon modes**: `'favicon'` (uses `FaviconIcon` component which tries multiple favicon services with fallback chain) vs `'letter'` (generates a coloured circle with the first letter).
- **Background colour**: In `favicon` mode, `FaviconIcon`'s `onColor` callback fires with an extracted dominant colour; this is passed as `cardStyle.backgroundColor` to `BaseWidget` so the entire widget card tints to match the site's brand.
- In `letter` mode, the background is set to `var(--w-accent)` immediately (no async extraction needed).
- On hover, a `Popup` tooltip shows "Go to {name}".
- Empty state (no URL set): shows a `+` SVG button that opens the same `BookmarkSettings` panel as the ⋯ menu.
- `BookmarkSettings` renders a live preview of the icon + name + hostname before saving. A "Refresh icon" button (`RefreshIcon`) deletes the cached favicon entry for that hostname and remounts the `FaviconIcon` component.
- URL input strips `https://` prefix for cleaner display; `normalizeUrl` re-adds it before saving.

**Settings:** `url: string`, `name: string`, `iconMode: 'favicon'|'letter'`.

---

### Quick Access

**Category:** `tools` · **Type:** `quickAccess`

**What it does:** Displays the user's top 6 most-visited Chrome sites as a row of favicon tiles with labels. Extension-only (degrades to an unsupported message on the web).

**Files:**
```
quickAccess/
  Widget.jsx — main component + Tile sub-component
  config.js
```

**Key implementation details:**

- Calls `chrome.topSites.get(sites => ...)` once on mount. No polling (top sites change infrequently).
- Each `Tile` renders a `FaviconIcon` with `onColor` callback. On colour resolution, the tile background changes to `color-mix(in srgb, ${color} 16%, transparent)` and the border to `color-mix(in srgb, ${color} 38%, transparent)`.
- Loading state: tile container pulses via Tailwind `animate-pulse` while the favicon is still resolving.
- `cleanTitle(raw, url)` strips notification counts like `(3)` and publisher suffixes (`· Site Name`).
- No settings — no `onRemove` mechanism either (uses `BaseWidget` default which still shows the ⋯ remove option from `onRemove`).
- Grid layout: `grid-cols-6` with hover `scale-110` and active `scale-95` on the icon `div`.

**Settings:** None.

---

### Pomodoro

**Category:** `planning` · **Type:** `pomodoro`

**What it does:** A full-featured focus timer with preset durations (25 min, 30 min, 1 hr, Custom), auto-break support, session notes, ambient rain sounds, completion chime, and session history with stats. Two phases: **pick** (select duration) and **timer** (countdown with play/pause/reset/back). Persists across tab closes and syncs running state to Focus Mode.

**Files:**
```
pomodoro/
  Widget.jsx   — main component + PickPhase, DoneState sub-components
  Settings.jsx — chime, rain, auto-break toggles; break duration; session stats with weekly chart
  config.js    — grid position, icon, type, settingsComponent
  constants.js — PRESETS, BREAK_OPTIONS, PHASE, SESSION_TYPE, DEFAULT_SETTINGS
  chime.js     — Web Audio API two-tone completion chime (zero dependencies)
  utils.js     — formatTime, readPomodoro, loadHistory, saveSession, getStreak, getTodayMinutes, getWeeklyStats
```

**Key implementation details:**

- **Persistence**: `loadTimer(id)` / `saveTimer(id, state)` use `STORAGE_KEYS.pomodoroTimerState(id)` (per-instance key). When saving a running timer, the absolute `endTime` (epoch ms) is stored. On restore, `remaining = max(0, round((endTime - Date.now()) / 1000))` — so time elapsed while the tab was closed is correctly accounted for. State includes `sessionType` ('focus'|'break') for break mode restore.
- **Interval**: `setInterval(..., 1000)` decrements remaining. Saves every 5 seconds for crash recovery. On reaching 0: fires completion side-effects (history save, chime, SW notification).
- **Chime**: `chime.js` uses Web Audio API to generate a pleasant D4→G4 two-tone chime for focus complete, and a softer C5 tone for break complete. Zero external files — works offline.
- **Auto-break**: Configurable 5/10/15 min break timer auto-offered after focus sessions complete. Controlled by `autoBreak` + `breakDuration` settings. Break phase uses muted styling (gray preset pill) and a separate Break Complete chime.
- **Session notes**: A textarea appears in the Done state allowing the user to journal what they accomplished. Saved to history along with session metadata.
- **Session history**: `saveSession()` writes to `localStorage['pomodoro_history']` (max 500 entries, oldest trimmed). Each entry: `{ id, preset, duration, completedAt, note, type }`.
- **Stats** (in Settings): Session count, consecutive-day streak, today's focus minutes, and a CSS-only weekly bar chart (7 columns, accent bars). Uses `getStreak()`, `getTodayMinutes()`, `getWeeklyStats()` from utils.js.
- **Rain sounds**: Integrated via `useRainStream` hook. Toggled from Settings (not visible on widget face). Hidden `<audio>` element managed by the hook with 3s crossfade.
- **Focus Mode sync**: While running, `localStorage['fm_pomodoro']` is written with `{ running, remaining, total, preset, sessionType }`. `readPomodoro()` in `utils.js` reads this — used by Focus Mode's LeftZone `PomodoroPanel`. Cleared when paused or in pick phase.
- **Custom input**: Appears when the "Custom" preset pill is clicked. Accepts decimal minutes (e.g. `1.5` → 90 seconds). `Enter` key starts the timer.
- **Done state**: Shows "Session Complete" / "Break Complete" label (sentence case), note textarea, and action buttons. If auto-break is enabled, a "Start {X}m Break" button appears alongside "Done".
- `PRESETS = [{ label: '25 min', secs: 1500 }, ...]` — `secs: null` signals the "Custom" special case. Defined in `constants.js`, re-exported via `utils.js` for backward compatibility with Focus Mode.
- Sub-components extracted to keep cognitive complexity in check: `PickPhase`, `DoneState`, and the timer display is rendered inline with a clean centered countdown (no progress ring — removed per design review).

**Settings:** `soundEnabled: boolean`, `autoBreak: boolean`, `breakDuration: 5|10|15`, `rainSound: boolean`. All read via `useWidgetSettings(id, DEFAULT_SETTINGS)`.

---

### Media (Spotify + Browser)

**Category:** `tools` · **Type:** `media`

**What it does:** A media player widget with two layers: (1) **Spotify** — OAuth PKCE integration, album art, artist/title, play/pause/skip, colour-extracted gradient background; (2) **Chrome Media Sessions** — shows non-Spotify browser media (YouTube, SoundCloud, etc.) from the background service worker's `chromeSessions` map.

**Files:**
```
media/
  Widget.jsx    — main component (625 lines, very complex)
  config.js
  useSpotify.js — shared Spotify hook (polling + playback controls)
  utils.js      — full Spotify OAuth/PKCE, token management, API calls, Chrome media helpers, album art colour extraction
```

**Key implementation details:**

**Spotify layer:**
- `useSpotify.js`: polls `getCurrentPlayback()` every 5 s. Locally interpolates `progress` every second while playing (avoids 5s jumps). `handleToggle/Next/Prev` optimistically update state, then call the Spotify API. After skip, waits 500 ms then calls `refresh()`.
- `utils.js` (`connectSpotify`): Full PKCE flow. Detects environment: web (popup + `postMessage`), Chrome extension (`chrome.identity.launchWebAuthFlow`), Firefox extension (`chrome.identity.getRedirectURL()`).
- Token storage: **extension** → `chrome.storage.local` (secure); **web** → `sessionStorage` (session-scoped, limits XSS exposure). A one-time migration moves legacy `localStorage` tokens to `chrome.storage.local`.
- Avatar URL is NOT persisted (contains Spotify user ID in CDN path). Only `{ name, product }` is persisted.
- `extractAlbumColor(imageUrl)`: draws the image into a 4×4 canvas and averages the pixel colours to get an approximate dominant colour.
- Gradient background: `dark(r, g, b, f)` helper darkens the extracted colour for the gradient.

**Chrome Media layer:**
- `getChromeMedia()` sends `{ type: 'GET_CHROME_MEDIA' }` to the background SW, which responds with up to 3 active media sessions.
- `ChromeMediaStrip`: Compact row for non-active sessions. Clicking the strip body promotes that session to the main player slot (stored in `chromePendingTabId` with a 500 ms debounce via `chromePendingTimeoutRef`).
- `SOURCE_META` maps hostnames (e.g. `'music.youtube.com'`) to `{ color, label }` for the coloured artwork ring (CSS `outline`).
- `DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true'` — exposes extra logging in development.

**SpotifySettings panel** (inside the ⋯ modal): Shows connect/disconnect. Displays Spotify plan tier (`spotifyTierLabel`). On connect, a `storage` event listener detects the `spotify_connected` key change.

**Settings:** None persisted via `useWidgetSettings` (connection state is global in `localStorage`).

---

### Stock (NEPSE)

**Category:** `info` · **Type:** `stock`

**What it does:** Shows NEPSE stock data for 1–3 symbols. Single-symbol mode shows a sparkline chart (90-day daily closes), price, change, and O/H/L row. Multi-symbol mode shows a compact watchlist with symbol, price, and % change per row.

**Files:**
```
stock/
  Widget.jsx    — main component + Sparkline + StockRow
  Settings.jsx  — symbol search + selection (up to 3, auto-closes on 3rd pick)
  config.js
  useStocks.js  — shared hook for Focus Mode (reads from Zustand, polls every 5 min)
  utils.js      — fetchChart, fetchCompanies, buildSparklinePaths, priceStats, LTTB
```

**Key implementation details:**

- **Data sources**:
  - Chart data: `merolagani.com/handlers/TechnicalChartHandler.ashx` (90-day OHLCV).
  - Company list: `nepalipaisa.com/api/GetCompanies` (POST with empty JSON body).
  - Both routed through env-aware URL builders: `dev → Vite proxy`, `extension → direct (host_permissions)`, `web → Vercel proxy routes`.
- `fetchChart(symbol)` extracts: `prices = c[]` (all closes for sparkline), `ltp = c[n-1]`, `prevClose = c[n-2]`, `open/high/low = o/h/l[n-1]`.
- **Sparkline** (`buildSparklinePaths`): LTTB (Largest Triangle Three Buckets) downsampling to 40 points, then Catmull-Rom bezier curve. Enforces a 1.5% minimum visual range to prevent low-volatility stocks from appearing as noise.
- The `Sparkline` SVG uses a `ResizeObserver` on itself to set its `viewBox` width — making it truly responsive.
- Price font size scales with digit count: 6+ digits → `1.05rem`, 5 → `1.2rem`, narrow card → `1.35rem`, otherwise `clamp`.
- `useStocks.js` (for Focus Mode): reads the first `stock` instance's settings from Zustand, polls every 5 min.
- `priceStats(chart)` derives `{ change, pct, dir }` from `ltp - prevClose`.

**Settings:** `symbols: string[]` (up to 3 NEPSE ticker symbols, default `['NEPSE']`).

---

### Occasions (Birthdays)

**Category:** `planning` · **Type:** `ocasions`

**What it does:** Shows up to 3 upcoming birthdays, anniversaries, or special days. Pulls from Google Contacts (People API) + manually added entries. Each row has a coloured avatar, type icon, name, and a days-away chip.

**Files:**
```
occasions/
  Widget.jsx      — main component + Avatar, DaysChip, TypeIcon, ListRow
  Settings.jsx    — OccasionsSettings (Google Contacts integration row + manual entries list)
  AddOccasion.jsx — modal form (name, type, month, day)
  config.js
  useOccasions.js — shared hook for Focus Mode (reads cache, no sync)
  utils.js        — nextOccurrence, daysAway, enrich, computeUpcoming, display helpers, avatarColor
```

**Key implementation details:**

- `computeUpcoming(raw)`: enriches entries with `{ nextDate, daysAway }`, deduplicates by `(name, type, month, day)` (prevents overlap between Google Contacts + manual), sorts by `daysAway` ascending, slices to max 3.
- `nextOccurrence(month, day)` returns the same month/day this year if still in the future, else next year. Year-independent (no stored birth year needed).
- **Google Contacts sync**: calls `getContactBirthdays(interactive)` from `src/utilities/googleContacts.js`. Results cached in `chrome.storage.local`. `loadCachedContacts()` is async; called on mount and after `GOOGLE_ACCOUNT_CHANGED` event.
- `avatarColor(name)`: deterministic hash of the name string → index into `AVATAR_PALETTE` (8 warm/earthy colour pairs).
- **Hero row** (index 0): highlighted with accent-tinted background, accent-coloured left bar, and accent-coloured name text.
- `DaysChip`: Today → accent fill + "🎉"; Tomorrow → muted chip; ≤7 days → accent text; further → gray text.
- `useOccasions.js`: Shared hook for Focus Mode's `OccasionPanel`. Reads cache only (no interactive sync). Refreshes every hour.

**Settings:** Manual entries (name, type, month, day) managed via `OccasionsSettings`. Google Contacts connection managed via `AccountsDialog`.

---

### Dailys

**Category:** `info` · **Type:** `dailys`

**What it does:** Shows one piece of daily content in three modes: **Wit** (witty/sarcastic quote), **Joke** (dad joke from `icanhazdadjoke.com`), or **Fact** (interesting fact). The shown item is deterministic per calendar day.

**Files:**
```
dailys/
  Widget.jsx      — main component + WitDisplay, JokeDisplay, FactDisplay
  config.js
  useDailyJoke.js — fetches + caches one dad joke per day
```

**Key implementation details:**

- `getDailyIndex(len) = floor(Date.now() / 86_400_000) % len` — produces a stable index that changes exactly at UTC midnight.
- **Quote data**: `src/data/quotes.js` (static bundled array of `{ text, author, category }`).
- **Fact data**: `src/data/facts.js` (static bundled array of `{ text, category }`).
- **Joke data** (`useDailyJoke`): Fetches `https://icanhazdadjoke.com/` once per day. Response cached in `localStorage['dailys_joke_cache']` as `{ date: 'YYYY-MM-DD', joke }`. Subsequent loads are instant. Timeout is 6 seconds (`AbortSignal.timeout(6000)`). `User-Agent` header set to avoid 403.
- Three fallback messages for the joke fetch failure, also cycled daily.
- All three modes include an accent-colored `category` chip.
- Settings rendered inline as a `SegmentedControl` (not in a separate `Settings.jsx`).

**Settings:** `mode: 'quote'|'joke'|'fact'`.

---

### RSS / News Feed

**Category:** `info` · **Type:** `rss`

**What it does:** Displays news headlines from RSS feeds. Two layouts: **Spotlight** (marquee card, one story at a time, swipeable/auto-advancing) and **Digest** (scrollable list of headline rows). Supports curated preset feeds and custom OPML-imported feeds (OPML is the universal RSS subscription exchange format).

**Files:**
```
rss/
  Widget.jsx      — main component (750 lines) + MarqueeCard, HeadlineRow, skeletons
  Settings.jsx    — preset toggles + OPML import/export Data section
  config.js
  constants.js    — VIEW_MODES, AUTO_ADVANCE_MS (20s)
  opmlParser.js   — DOMParser-based OPML parser + generateOPML export + sample OPML
  OPMLImport.jsx  — collapsible OPML import panel (File picker + Paste XML with preview)
  useRss.js       — single-feed hook with cache + polling
  useRssMulti.js  — multi-feed hook (parallel fetch, merge, sort by date)
  utils.js        — rssUrl, PRESET_FEEDS, cache, fetchFeed, relativeTime
```

**Key implementation details:**

- **17 preset feeds** across 3 categories: International (BBC, Guardian, Al Jazeera, DW, NPR, NY Times), Tech (Hacker News, The Verge, TechCrunch, Ars Technica, Wired, MIT Tech Review), Nepal (Online Khabar, Setopati, Ratopati, Nagarik News, Kathmandu Post). Default active: `['hn', 'bbc', 'guardian']`.
- **OPML Import**: Pure `DOMParser`-based parser (`opmlParser.js`) — zero dependencies. Supports nested folder flattening, URL deduplication, and URL validation (invalid URLs flagged with ⚠️). Two methods: file picker (`.opml`/`.xml`) and paste XML text. Shows a preview with per-feed checkboxes before importing. Already-existing feeds are grayed out and disabled. Merges with custom feeds, skipping duplicates.
- **OPML Export**: `generateOPML()` creates valid OPML XML from the current custom feeds with proper XML escaping. Downloaded via `downloadFile()` blob helper.
- **Sample OPML**: `generateSampleOPML()` produces a ready-to-use OPML with real Nepali news feeds organized in "News" and "Podcasts" folders, demonstrating the nested outline structure.
- **JSON support removed**: Only OPML is supported for import/export. The Data section has Export OPML + Import OPML buttons, a guidance callout mentioning online OPML generators and podcast support, and footer actions (Sample OPML | Clear All).
- **CORS proxy**: RSS feeds are CORS-blocked. The proxy at `https://undistractedme.sarojbelbase.com.np/api/rss/feed?url=...` is used in both web and extension contexts. Dev uses the Vite dev server middleware.
- **Cache**: `localStorage['rss_cache_{feedId}']` — TTL 10 min. Cache is read instantly on mount; network fetch skipped if cache is fresh.
- `useRssMulti`: Fetches all active feeds in `Promise.allSettled`, injects a `source` label into each item, sorts by `isoDate` descending, merges into a flat list. Each feed's cache key is `custom_${url}`. Epoch counter prevents slow initial loads from overwriting faster manual refreshes.
- **Seen-links deduplication**: `seenLinksRef` tracks links already shown; new items from a refresh are prepended without duplicating existing ones.
- **IntersectionObserver** on a `sentinelRef` at the bottom of the Digest list triggers loading more items when scrolled into view (`visibleCount` incremented).
- **Spotlight / MarqueeCard**: Touch/mouse drag support (`handlePointerDown/Move/Up`) with resistance. Swipes > 40px navigate; smaller ones snap back. Auto-advance via a 20s `setInterval`. Scrolling dot pagination indicator.
- **Source mode**: `'presets'` (from `PRESET_FEEDS`) and `'custom'` (from OPML imports) are mutually exclusive. Custom feeds are stored as `[{ label, url, active }]`.
- **Data section** (in Settings): Follows the expense tracker pattern with `w-label` "Data" header, InfoCircle disclaimer tooltip ("Importing replaces all existing feeds..."), Export OPML + Import OPML accent buttons, guidance callout about OPML format, and footer with Sample OPML and Clear All (ConfirmButton, danger style).

**Settings:** `activeFeedIds: string[]`, `customFeeds: {label, url, active}[]`, `sourceMode: 'presets'|'custom'`, `viewMode: 'marquee'|'brief'`.

---

## Config Shape Reference

Every widget exports a default config object from its `config.js`:

```src/widgets/clock/config.js#L1-14
{
  type: string,          // unique type key (used as WIDGET_TYPES value)
  title: string,         // display name in WidgetCatalog
  category: string,      // 'time' | 'planning' | 'info' | 'tools'
  icon: ReactComponent,  // react-bootstrap-icons component
  description: string,   // subtitle in WidgetCatalog
  enabled: boolean,      // whether shown in WIDGET_REGISTRY
  x: number,             // default lg grid column (0-based)
  y: number,             // default lg grid row (0-based, Infinity = bottom)
  w: number,             // default width in lg grid columns
  h: number,             // default height in grid rows (1 row = 8.5px)
  breakpoints: {         // optional per-breakpoint overrides
    md?: { x, y, w, h },
    sm?: { x, y, w, h },
    xs?: { x, y, w, h },
    xxs?: { x, y, w, h },
  },
  Component: ReactComponent,  // the Widget component
}
```

> `y: Infinity` causes `react-grid-layout` to place the widget at the bottom of the grid automatically.

---

## Widget Type ↔ Storage Key Map

| Widget | localStorage key(s) | chrome.storage.local key(s) |
|---|---|---|
| All widgets | `widgetSettings_${id}` (via Zustand mirror) | — |
| All widgets | `widget_layout` | — |
| Countdown | `countdown_events`, `countdown_pinned_${id}`, `countdown_notified` | — |
| Events / Calendar | `local_events` (via Zustand) | `gcal_events_cache` |
| Pomodoro | `pomodoro_timer_state_${id}`, `fm_pomodoro` (while running) | — |
| Spotify | `spotify_connected`, `spotify_profile` | `spotify_tokens` |
| Occasions | `manual_birthdays` | `contacts_cache`, `contacts_synced_at` |
| Notes | (via `widgetSettings_${id}`) | — |
| RSS | `rss_cache_${feedId}` (TTL 10 min) | — |
| Weather | `weather_cache_v1` (TTL 30 min) | — |
| Dailys | `dailys_joke_cache` (TTL 1 day) | — |
| All | `widget_instances` (Zustand persisted) | — |

---

## Cross-cutting Patterns

### 1. `onClockTick` — Zero-drift updates
Widgets that update on the second (`Clock`, `Countdown`, `Pomodoro`) or minute (`Progress`, `DateToday`) use `onClockTick(fn)` from `src/utilities/sharedClock.js`. A Web Locks leader-election mechanism picks one tab to hold the lock and broadcast second-aligned ticks via `BroadcastChannel`. All other tabs receive ticks without running their own intervals.

### 2. Popup — Portal tooltip positioning
The shared `Popup` component (`src/components/ui/Popup.jsx`) uses a two-phase mount: first render at an off-screen position to measure its own size, then flip above/below and clamp to viewport edges. Used by Calendar day tooltips, BookmarkCard hover, Weather precip bars, and Quick Access tiles.

### 3. `useAgeLabel(timestamp)` — "synced 2 min ago"
`src/hooks/useAgeLabel.js` wraps `humanizeAge` from `src/utilities/index.js`. Used by Events, Occasions, and Stock to show a human-readable sync age. Updates every 30 seconds.

### 4. Settings always via `useWidgetSettings(id, defaults)`
Every widget reads and writes its own settings through this hook. The `id` is the widget instance UUID — supporting multiple independent instances of the same widget type with separate settings.

### 5. `IntegrationRow` — OAuth integration cards
`src/components/ui/IntegrationRow.jsx` is a standardised connect/disconnect row used in Settings panels for Google Calendar (Events), Google Contacts (Occasions), and Spotify (Media). The actual connect/disconnect logic opens `AccountsDialog` via `useUIStore`.

### 6. Dual-mode: Preset + Custom
Both RSS and Stock follow the pattern of offering curated preset options (preset feeds / NEPSE top companies) while also allowing fully custom user-defined options (JSON upload / symbol search).

### 7. CSS variable design tokens
All widget colours reference `var(--w-*)` tokens: `--w-ink-1..6` (text), `--w-accent` / `--w-accent-fg`, `--w-success`, `--w-danger`, `--card-bg`, `--card-border`, `--card-blur`, `--panel-bg`. This makes widgets automatically theme-aware across light/dark/accent-color changes.

### 8. `ConfirmButton` for destructive actions
Destructive actions (widget removal, countdown deletion, settings reset) are wrapped in `ConfirmButton` which requires a second click within a timeout (default 3s, reset 4s) to confirm.

### 9. Per-breakpoint grid positions
Every widget defines `breakpoints: { md, sm, xs, xxs }` in its config. If a saved layout exists for a breakpoint, it is used (with `h` floored to config minimum). If not, the config positions are used as defaults.

### 10. `_fromCountdown` event flag
Countdown creates synthetic events (to avoid polluting the Events widget) by setting `_fromCountdown: true` on event objects it stores in the shared events list. The Events widget can filter these out if needed.
