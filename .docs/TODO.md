# Undistracted Me - Project Roadmap & TODOs

This document serves as a persistent record of completed project phases and a roadmap for future development. It is intended to help new contributors (and AI agents) understand the project's trajectory.

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

### Phase 5: Backend / API Integration
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
