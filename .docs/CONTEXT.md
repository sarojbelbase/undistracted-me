# Undistracted Me — Context

## Overview
React 19 browser extension (Chrome + Firefox, Manifest V3) replacing the new tab page. Two modes:
1. **Focused** (`showWidgets=false`): Dark `#18191B` bg, giant Nepali date + clock centered
2. **Dashboard** (`showWidgets=true`): Light `#F0F0F2` bg, draggable widget grid

## Tech Stack
- **React 19**, **Vite**, **@crxjs/vite-plugin**
- **Tailwind CSS v4** — `@import "tailwindcss"` in App.css (NOT `@tailwind base/components/utilities`)
- **react-grid-layout** — `Responsive` + `useContainerWidth()` (NOT WidthProvider — Vite CJS incompatibility)
- **react-bootstrap-icons** — all icons, no inline SVGs
- **dayjs** + timezone plugin (Asia/Kathmandu)

## Design System (App.css)
- Tokens: `--w-ink-1` (#111827) → `--w-ink-6` (#d1d5db) — shift palette here
- Classes: `w-display`, `w-heading`, `w-title-soft/bold`, `w-sub-soft/bold`, `w-period`, `w-body`, `w-caption`, `w-label`, `w-muted`, `w-dot`/`w-dot-active`

## Key Files
```
src/
  App.jsx              — root, mode toggle, settings overlay
  App.css              — design tokens, typography classes, grid overrides
  widgets/
    WidgetGrid.jsx     — Responsive grid, per-breakpoint layout persistence (widget_grid_layouts)
    BaseWidget.jsx     — forwardRef card, GearWide settings popover, mousedown click-outside
    useWidgetSettings.js — per-widget localStorage (widgetSettings_${id})
    useEvents.js       — shared events: module-level cache, SYNC_EVENT broadcast
    index.js           — WIDGET_TYPES, WIDGET_REGISTRY, all exports
    clock/             — live 1s clock, 24h/12h, time-aware greetings
    dateToday/         — weekday + date, BS/AD toggle
    dayProgress/       — 24-dot grid, 1-min interval
    events/            — CreateModal (Today/Tomorrow/Custom chips), AllEventsModal, createPortal
    countdown/         — reads useEvents, nearest future event
    calendar/          — BS/AD, event dots, today = dark fill + white text (inline style)
    weather/           — OpenWeatherMap API, geolocation, VITE_OWM_API_KEY in .env
```

## Critical Rules
- **Modals** → `createPortal(…, document.body)` — CSS `transform` in grid breaks `position:fixed`
- **Cross-widget sync** → module-level cache + `dispatchEvent(new Event('widget_events_changed'))`. Never mutate inside `setState(prev =>)` when dispatching (StrictMode double-invoke = double event)
- **Drag buttons** → `onMouseDown={e => e.stopPropagation()}` on any button inside a widget
- **Per-breakpoint layout** → save `allLayouts` (2nd arg of `onLayoutChange`) not just current
- **Icons** → react-bootstrap-icons only

## localStorage Keys
- `language`, `showWidgets`, `showMitiInIcon`
- `widgetSettings_${widgetId}` — per-widget settings
- `widget_events` — events array `{ id, title, startDate, startTime, endDate, endTime }`
- `widget_grid_layouts` — `{ lg: [...], md: [...], ... }` per breakpoint

## Event Shape
`{ id, title, startDate, startTime, endDate, endTime }` — dates `YYYY-MM-DD`, times `HH:MM` 24h

## Commands
- `npm run dev` — Vite dev server
- `npm run build` — extension build


## Tech Stack
- **Framework**: React (v18/19 compatible)
- **Build Tool**: Vite (configured for Chrome/Firefox Extension builds via `@crxjs/vite-plugin`)
- **Styling**: Tailwind CSS v4 (using `@import "tailwindcss"` in `src/App.css`)
- **Grid Layout**: `react-grid-layout` (v2+)
- **State & Persistence**: React State + `localStorage` (Zustand planned/available for complex state)
- **Icons**: `lucide-react` (planned/available)
- **Fonts**: Custom local fonts (loaded via `src/assets/css/fonts.css`)

## Architecture & Core Systems

### 1. Modular Widget System (`src/widgets/`)
The core of the application is the `WidgetGrid.jsx` which utilizes `react-grid-layout`.
- **Warning on `react-grid-layout`**: Do NOT use the legacy `WidthProvider` HOC. Vite does not play nicely with its CommonJS exports. We use the modern native hook `useContainerWidth()` and the base `<Responsive>` component instead.
- **Widgets**: Individual components (`ClockWidget`, `WeatherWidget`, `CalendarWidget`, `EventsWidget`, `DayProgressWidget`, `CountdownWidget`) wrap their content in `<BaseWidget>`.
- **BaseWidget**: Provides the unified glassmorphism styling (`bg-white/10 backdrop-blur-md rounded-3xl text-white shadow-xl`), standardized padding, and the remove button functionality during edit mode.

### 2. Styling System (Tailwind v4)
- We use Tailwind CSS v4. The main entry is `src/App.css` containing `@import "tailwindcss";`.
- The app uses a dark gradient background configured in `App.css` (`--gradient`).
- UI elements heavily rely on high-contrast white text (`text-white`, `text-white/80`, `text-white/60`) and translucent backgrounds (`bg-white/10`, `bg-white/20`) to achieve the premium glass vibe against the dark background.

### 3. State Management
- `showWidgets`: Toggles between the minimal focused view (huge clock) and the full dashboard widget view.
- `layouts`: Stores the `react-grid-layout` breakpoints and coordinates for widgets. Saved to `localStorage('widgetLayouts')`.
- `widgets`: Stores the active list of widgets to render. Saved to `localStorage('activeWidgets')`.

## Project History & Current State
The project has undergone 4 major phases:
1. **Setup**: Vite + Extension config.
2. **Feature Implementation**: Static widget components created.
3. **Design Polish**: Layouts refined.
4. **Modular Grid System**: (Current State) Completely dynamic grid using `react-grid-layout`. All widgets are draggable, resizable (configurable), and have cohesive glassmorphism styling.

## How to Run & Build
- **Development**: `npm run dev` (Runs the standard Vite web server on `localhost:3000`).
- **Production/Extension Build**: `npm run build` (Builds the extension using the CRXJS Vite plugin based on `public/manifest.json`).

## AI Agent / LLM Guidelines
- **CSS**: Always use Tailwind classes. Preserve the glassmorphism theme (do not use solid white backgrounds `bg-white` for cards).
- **Grid**: If modifying grid logic, refer to `useGridLayout` or `Responsive` from `react-grid-layout`. Ensure compatibility with ES Modules.
- **Context Updates**: When adding new major features, architectural changes, or fixing profound bugs (like the Vite CJS interop issue), append or modify this file so future models have the updated context.
