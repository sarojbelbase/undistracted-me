# Test Coverage — Undistracted Me

> **83 tests · 4 spec files · Playwright / Chromium**
> Run: `npm test` (headless) · `npm run test:ui` (interactive) · `npm run test:headed`

---

## File map

```
tests/
└── playwright/
    ├── specs/
    │   ├── main-view.spec.js        ← Classic Nepali-date view (no widgets)
    │   ├── settings.spec.js         ← Settings panel behaviour
    │   ├── widgets.spec.js          ← Grid-level / catalog / show-hide
    │   └── widget-behaviors.spec.js ← Per-widget isolated tests (13 widgets)
    ├── screenshots/                 ← Written by widgets.spec.js "Screenshot" test
    └── report/                      ← HTML report output (npm run test:report)
```

---

## `main-view.spec.js` — 10 tests

Classic mode (`showWidgets=false`): the full-screen Nepali date centred on a dark background.

| # | Test | What is verified |
|---|------|-----------------|
| 1 | Nepali date visible and non-empty | `#nepalimiti` renders & has text |
| 2 | English date visible and non-empty | `#datetoday` renders & has text |
| 3 | Live clock visible and non-empty | `#liveclock` renders & has text |
| 4 | Nepali date not clipped / fits viewport | `scrollWidth ≤ clientWidth`, bounding box inside 1440×900 |
| 5 | English date not clipped / fits viewport | same |
| 6 | Live clock not clipped / fits viewport | same |
| 7 | Language switch to Nepali changes text | Text differs after `localStorage.language = 'ne'` + reload |
| 8 | No clipping at FHD (1920×1080) | All 3 elements within viewport |
| 9 | No clipping at Laptop (1280×800) | All 3 elements within viewport |
| 10 | No clipping at Tablet (768×1024) | All 3 elements within viewport |

### Not yet covered
- [ ] `language = 'ne'` font actually loads (Akshar) — no font-load assertion
- [ ] Very small viewport (e.g. 375×667 mobile) — 9vw font may still overflow

---

## `settings.spec.js` — 12 tests

| # | Test | What is verified |
|---|------|-----------------|
| 1 | Settings gear button visible | `[title="Settings"]` present |
| 2 | Gear opens settings panel | Panel shows "Appearance" section |
| 3 | Click outside closes panel | Panel disappears on outside `mousedown` |
| 4 | Settings panel does not overflow viewport | Bounding box ≤ viewport |
| 5 | Language persists as "en" by default | `localStorage.language === 'en'` |
| 6 | Settings reveals Language section | "Language" text visible in panel |
| 7 | Dark/Light mode buttons visible | Both buttons present |
| 8 | Light mode persists in localStorage | `localStorage.app_mode === 'light'` after click |
| 9 | Dark mode persists in localStorage | `localStorage.app_mode === 'dark'` after click |
| 10 | Accent colour section visible and not clipped | "Accent" text visible, panel ≤ viewport |
| 11 | Widget show/hide button visible | `[title~="Widgets"]` button present |
| 12 | Widget catalog / hamburger visible | `[title="Manage Widgets"]` button present |

### Not yet covered
- [ ] Changing language to **Nepali** via Settings panel UI (toggle button click vs. localStorage)
- [ ] Each of the 11 accent colour swatches saves to `localStorage.app_accent`
- [ ] Settings panel keyboard accessibility (Tab / Escape)
- [ ] Google Calendar connect / disconnect flow (requires OAuth mock)

---

## `widgets.spec.js` — 10 tests

Grid-level system tests with all default widgets mounted.

| # | Test | What is verified |
|---|------|-----------------|
| 1 | Grid renders at least one widget | `.react-grid-item` count > 0 |
| 2 | Grid container present | `.react-grid-layout` attached to DOM |
| 3 | No widget overflows viewport horizontally | All `boundingBox.x + width ≤ viewportWidth` |
| 4 | No widget card clips inner content | All `.rounded-2xl` scroll dims within client dims |
| 5 | Screenshot every widget | Saves `.png` per widget to `screenshots/` |
| 6 | Catalog drawer opens | "Widgets" tab text visible after hamburger click |
| 7 | Catalog drawer does not overflow viewport | Drawer bounding box ≤ viewport |
| 8 | Catalog closes on backdrop click | `[style*="width: 320"]` detached after click |
| 9 | Widget toggle hides grid | `#nepalimiti` visible after "Hide Widgets" click |
| 10 | Widget toggle shows grid again | `.react-grid-layout` re-attached after "Show Widgets" |

### Not yet covered
- [ ] Adding a widget from the catalog (click "+ Add") persists to `widget_instances`
- [ ] Removing a widget via three-dots → Remove
- [ ] Drag-and-drop reorder saves to `widget_grid_layouts`
- [ ] Resize of a grid item updates layout
- [ ] Settings export / import (settingsIO) via catalog "Settings" tab
- [ ] Reset to defaults from catalog
- [ ] Catalog tabs: "Widgets" tab vs "Settings" tab
- [ ] All 4 category tabs (Time, Planning, Info, Tools) render their widgets

---

## `widget-behaviors.spec.js` — 51 tests

Each describe block mounts **exactly one widget** in isolation via `widget_instances` in localStorage.

### Clock (6 tests)
| Test | What is verified |
|------|-----------------|
| 24h renders HH:MM, no AM/PM | Format `\d{2}:\d{2}`, no AM/PM text |
| 12h renders with AM or PM | Format matched, AM/PM present |
| Greeting text shows | Non-trivial text after time string |
| Extra TZ clock with London | "London" label visible |
| Settings panel shows format radios | "Time Format", "24-hour", "12-hour (AM/PM)" visible |
| Not clipped | `assertNoClip` + `assertInViewport` |

#### Not yet covered
- [ ] Changing format via the radio saves `widgetSettings_clock.format`
- [ ] Removing an extra TZ (× button) removes it from settings
- [ ] Second extra TZ `[1]` only visible after first is picked

### DateToday (4 tests)
| Test | What is verified |
|------|-----------------|
| Shows a day number 1–31 | Day number present in text |
| Shows month name | One of 12 English month names present |
| Shows weekday name | One of 7 day names present |
| Not clipped | `assertNoClip` + `assertInViewport` |

#### Not yet covered
- [ ] Nepali language setting changes rendered text
- [ ] Widget settings modal opens with Language option

### DayProgress (4 tests)
| Test | What is verified |
|------|-----------------|
| Shows `XX%` label | % sign present |
| Exactly 24 `.w-dot` elements | `toHaveCount(24)` |
| Active dots ≤ current hour | Count comparison |
| Not clipped | `assertNoClip` + `assertInViewport` |

#### Not yet covered
- [ ] At midnight (hour 0) zero dots are active
- [ ] Settings modal (if any) for DayProgress

### Countdown (3 tests)
| Test | What is verified |
|------|-----------------|
| Empty state "No countdowns yet" | Empty message visible |
| Pre-seeded future event shows title + "days" | Title and "days" present |
| Not clipped (empty state) | `assertNoClip` + `assertInViewport` |

#### Not yet covered
- [ ] Add countdown modal opens (+ button click)
- [ ] Saving a custom countdown persists to `localStorage.countdown_events`
- [ ] Pinning/unpinning a countdown
- [ ] Repeat badge shown for repeating events
- [ ] "Complete!" / 🎉 state when `targetDate` is today

### Notes (4 tests)
| Test | What is verified |
|------|-----------------|
| Textarea + placeholder "New note..." | `<textarea>` visible with correct placeholder |
| Pre-seeded text shows | `toHaveValue('Hello Playwright')` |
| Typing persists to localStorage | `widgetSettings_notes.text` updated |
| Not clipped | `assertNoClip` + `assertInViewport` |

#### Not yet covered
- [ ] Hide / show toggle blurs and unblurs text
- [ ] Expand modal opens on expand button click
- [ ] Expanded modal closes on backdrop click or FullscreenExit button
- [ ] Note colour change from settings (colour swatch updates card background)
- [ ] Expanded modal textarea also persists changes

### Facts (3 tests)
| Test | What is verified |
|------|-----------------|
| Non-empty fact text | > 10 characters |
| Category badge present | At least 2 lines in text |
| Not clipped | `assertNoClip` + `assertInViewport` |

#### Not yet covered
- [ ] Fact changes on next calendar day (day index logic)
- [ ] Category is one of the known categories in `facts.js`

### Bookmarks (4 tests)
| Test | What is verified |
|------|-----------------|
| Add button visible | Button present |
| Pre-seeded bookmark renders as `<a href>` | Anchor with correct href |
| Add modal opens with URL input | `input[type="url"]` visible |
| Not clipped | `assertNoClip` + `assertInViewport` |

#### Not yet covered
- [ ] Saving a bookmark persists to `widgetSettings_bookmarks.links`
- [ ] Clicking a bookmark opens correct URL
- [ ] Removing a bookmark (− button) removes from list and localStorage
- [ ] Favicon image is rendered for a known domain

### Weather (2 tests)
| Test | What is verified |
|------|-----------------|
| No-key / loading / weather state each valid | Any one of the three states renders |
| Not clipped | `assertNoClip` + `assertInViewport` |

#### Not yet covered
- [ ] Mocked API response renders city name + temperature
- [ ] Unit toggle (°C ↔ °F) changes displayed unit and persists setting
- [ ] Location denied state shows correct error message
- [ ] Error state shows error text

### Stock (4 tests)
| Test | What is verified |
|------|-----------------|
| Card visible | `.rounded-2xl` attached |
| Symbol label shown | Widget has non-empty text |
| SVG sparkline present | `<svg>` count ≥ 0 |
| Not clipped | `assertNoClip` + `assertInViewport` |

#### Not yet covered
- [ ] Mocked proxy response renders price + % change
- [ ] Multiple symbols (2–3) each render a row with symbol name
- [ ] Direction arrow colour (green/red) reflects `dir` value
- [ ] Stock settings modal opens and shows symbol picker

### Pomodoro (7 tests)
| Test | What is verified |
|------|-----------------|
| Shows "Focus Timer" heading | Text present in pick phase |
| All 4 preset buttons present | 25 min, 30 min, 1 hr, Custom |
| Preset click shows `25:00` | Timer phase renders MM:SS |
| Play/pause button visible in timer phase | Button count > 0 |
| Back button returns to pick phase | "Focus Timer" visible again |
| Not clipped (pick phase) | `assertNoClip` + `assertInViewport` |
| Not clipped (timer phase) | `assertNoClip` + `assertInViewport` |

#### Not yet covered
- [ ] Start / pause timer (running state decrements remaining)
- [ ] Reset button restores full duration
- [ ] Custom duration input: type minutes → Enter starts timer
- [ ] Chrome notification sent when timer hits 0 (mock `chrome.runtime.sendMessage`)
- [ ] "done" state (🎉 text) when remaining reaches 0

### Events (4 tests)
| Test | What is verified |
|------|-----------------|
| Card visible | `.rounded-2xl` attached |
| Non-empty render | `innerText` length > 0 |
| Create button present | `button` count > 0 |
| Not clipped | `assertNoClip` + `assertInViewport` |

#### Not yet covered
- [ ] Create event modal opens on + button click
- [ ] Saving an event persists to `useEvents` localStorage key
- [ ] Event shows in the correct date bucket (Today / Tomorrow / Later)
- [ ] Deleting an event removes it from the list
- [ ] Google Calendar events appear when `gcalEvents` is seeded in localStorage

### Calendar (4 tests)
| Test | What is verified |
|------|-----------------|
| Weekday headers visible | `sun|mon|tue…` in text |
| Current year shown | 4-digit year in text |
| Day numbers in grid | `\b1\b` present |
| Not clipped | `assertNoClip` + `assertInViewport` |

#### Not yet covered
- [ ] Today's date cell has accent background
- [ ] Previous / Next month navigation works
- [ ] Event dot appears on a day with a seeded event
- [ ] Tooltip appears on hover over a day with events
- [ ] Calendar type switch (Nepali / English) changes displayed dates

### Spotify (2 tests)
| Test | What is verified |
|------|-----------------|
| "Connect Spotify" button shown when unauthenticated | Text + button present |
| Button visible and not clipped | `assertInViewport`, `assertNoClip` |

#### Not yet covered
- [ ] Connected state: mock `spotify_tokens` → renders profile name + "Connected"
- [ ] "Nothing is playing" state when token exists but no active track
- [ ] Track info (title, artist, album art) with mocked playback response
- [ ] Play / pause button click calls `setPlayPause` (mock fetch)
- [ ] Disconnect button removes tokens from localStorage

---

## Coverage summary

| Area | Covered by tests | Gap |
|------|-----------------|-----|
| Classic Nepali date view | ✅ visibility, content, clipping, language, 3 viewports | Mobile viewport, font load, badge |
| Settings panel | ✅ open/close, mode, accent section, language section | Language toggle UI, each accent swatch, keyboard nav, GCal OAuth |
| Widget grid (system level) | ✅ presence, overflow, catalog, show/hide | Add/remove, drag-drop, resize, import/export |
| Clock | ✅ formats, greeting, TZ, settings UI, clipping | Format-change persistence, TZ removal |
| DateToday | ✅ day/month/weekday, clipping | Nepali language mode |
| DayProgress | ✅ %, 24 dots, active count, clipping | Midnight edge case |
| Countdown | ✅ empty state, future event, clipping | Add modal, save, pin, repeat, complete state |
| Notes | ✅ textarea, seed, persist, clipping | Hide/show blur, expand modal, colour swatch |
| Facts | ✅ text, badge, clipping | Daily index rotation, category validation |
| Bookmarks | ✅ add button, seed renders, modal, clipping | Save, click, remove, favicon |
| Weather | ✅ no-key/loading/data state, clipping | Mocked data, unit toggle, location denied |
| Stock | ✅ card, text, SVG, clipping | Mocked price rows, direction colour, settings |
| Pomodoro | ✅ pick/timer phases, presets, back, clipping | Start/pause/reset, custom, done state, notification |
| Events | ✅ card, render, button, clipping | Create/save/delete, date buckets, GCal events |
| Calendar | ✅ headers, year, days, clipping | Today highlight, nav, event dot, tooltip, Nepali |
| Spotify | ✅ unauthenticated state and clipping | Connected/playing/track states, controls, disconnect |
