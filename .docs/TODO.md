# Undistracted Me — Roadmap & TODOs

## ✅ Done
- [x] Widget grid: drag, per-breakpoint layout persistence, dot-grid overlay, sibling dimming
- [x] Design system: `--w-ink-*` tokens + typography classes
- [x] BaseWidget: gear settings popover, click-outside, forwardRef
- [x] Events system: localStorage, cross-widget sync, create/delete, createPortal modals
- [x] Events UI: Today/Tomorrow/Custom chips, datetime-local picker, duration pills, View all, trash icon
- [x] Countdown: reads shared events, nearest future event
- [x] Calendar: event dots, today cell white text, BS/AD toggle
- [x] Clock: 24h/12h, time-aware greetings
- [x] Day progress: 24-dot grid, consistent alignment
- [x] Weather: OWM API, geolocation, BSicons

---

## 🚧 Up Next

### Short term
- [ ] **Weather** — error states, refresh interval, unit toggle (°C/°F)
- [ ] **Dynamic quotes** — rotating quotes widget (static JSON or API)

### Medium term
- [ ] **Theme customization** — swap `--w-ink-*` tokens via settings (light/dark/accent presets)
- [ ] **Notes widget** — sticky-note textarea, localStorage persist
- [ ] **Pomodoro widget** — 25/5 timer, ring progress, session counter

### Later
- [ ] **Bookmarks widget** — pinned links with favicon, open in new tab
- [ ] **Onboarding** — first-run flow: API key prompt, widget picker
- [ ] **Build optimization** — manifest permissions audit, bundle size, Firefox packaging


## ✅ Completed Phases

### Phase 1: Foundation & Setup
- [x] Initialized Vite + React 19 project.
- [x] Configured `@crxjs/vite-plugin` for cross-browser extension support.
- [x] Set up Tailwind CSS v4 styling architecture.
- [x] Created basic component structure.

### Phase 2: Core Components & Widgets
- [x] Implemented global Search Bar Component with interactive animations.
- [x] Implemented Quick Links / Shortcuts Grid.
- [x] Built core static widgets: Weather, Todo/Events, Quote.

### Phase 3: Design Polish ("Glassmorphism")
- [x] Implemented dynamic Greeting Component.
- [x] Enlarged Hero Time Display.
- [x] Established a dark gradient global background (`--gradient` in `App.css`).
- [x] Standardized typography (custom local fonts) and component spacing.

### Phase 4: Modular Grid Layout System
- [x] Integrated `react-grid-layout` (using native `useContainerWidth()` hooks to bypass Vite CJS errors).
- [x] Refactored all widgets into a standardized `<BaseWidget />` wrapper.
- [x] Applied universal "Glassmorphism" styling (`bg-white/10`, `backdrop-blur-mdC`).
- [x] Implemented draggable and resizable edit mode.
- [x] Persisted grid coordinates and active widgets to `localStorage`.

---

## 🚧 Upcoming Phases (TODOs)

### Phase 5: Widget UX Polish
- [ ] **Remove focused/dashboard toggle**: The `ClockWidget` now embeds the full Nepali date + clock + English date display. Once users are happy with the widget mode, deprecate the focused mode toggle (the grid IS the homepage).
- [ ] **Per-widget settings UX**: Extend the `useWidgetSettings` + `BaseWidget` settings panel pattern to all other widgets (DayProgress, Weather, Events, Calendar, Countdown).

### Phase 6: Backend / API Integration
- [ ] **Weather Widget API**: Connect the static weather widget to a live API (e.g., OpenWeatherMap) based on user location.
- [ ] **Events/Calendar Integration**: Integrate with Google Calendar or similar APIs to fetch real tasks and events instead of static mock data.
- [ ] **Dynamic Quotes**: Fetch daily motivational quotes from a REST API.

### Phase 6: Advanced Settings & State Management
- [ ] **Zustand Implementation**: Migrate complex layout and widget state from basic `useState`/`localStorage` into a global `zustand` store (file `src/store/widgetStore.js` is mapped but needs full implementation).
- [ ] **Theme Customization**: Allow users to change the background gradient, adjust glassmorphism blur intensity, and choose custom highlight colors.
- [ ] **Language Localization**: Complete the `i18n` setup for full language support across all newly added modular widgets.

### Phase 7: Widget Library Expansion
- [ ] Add a "Notes/Scratchpad" widget.
- [ ] Add a "Pomodoro Timer" widget.
- [ ] Add a "Bookmarks Manager" widget.
- [ ] Create a UI flow for adding these new widgets to the grid from a widget library menu.

### Phase 8: Extension Distribution Polish
- [ ] Finalize `manifest.json` permissions based on required APIs (geolocation, storage, etc).
- [ ] Optimize build size and bundle splitting.
- [ ] Create onboarding flow for new users installing the extension.
