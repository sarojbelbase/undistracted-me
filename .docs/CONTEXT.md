# Undistracted Me — Context

## Overview
React 19 browser extension (Chrome + Firefox, Manifest V3) replacing the new tab page. Two modes:
1. **Focused** (`showWidgets=false`): Dark `#18191B` bg, giant Nepali date + clock centered
2. **Dashboard** (`showWidgets=true`): Themed bg via `--w-page-bg`, draggable widget grid

## Tech Stack
- **React 19**, **Vite**, **@crxjs/vite-plugin**
- **Tailwind CSS v4** — `@import "tailwindcss"` in App.css (NOT `@tailwind base/components/utilities`)
- **react-grid-layout** — `Responsive` + `useContainerWidth()` (NOT WidthProvider — Vite CJS incompatibility)
- **react-bootstrap-icons** — all icons, no inline SVGs
- **dayjs** + timezone plugin (Asia/Kathmandu)

## Theme System (`src/theme.js`)
- `ACCENT_COLORS` — 11 colors: Default, Blueberry, Strawberry, Bubblegum, Grape, Orange, Banana, Lime, Mint, Latte, Cocoa
- `LIGHT_TOKENS` / `DARK_TOKENS` — full CSS var maps applied to `:root` via `applyTheme(accent, mode)`
- CSS vars set: `--w-accent`, `--w-accent-fg`, `--w-accent-rgb`, `--w-ink-1..6`, `--w-surface`, `--w-surface-2`, `--w-border`, `--w-page-bg`
- `data-mode` attribute set on `<html>` — drives `[data-mode="dark"]` overrides in `App.css`
- `useTheme()` — `{ accent, mode, setAccent, setMode }`, persists to `app_accent` / `app_mode` in localStorage
- **Constraint**: `"Default"` accent is incompatible with dark mode (near-black on dark = invisible text). Switching to dark auto-selects Blueberry; Default swatch is disabled (opacity 30%, `not-allowed` cursor) in dark mode.
- `applyTheme` is called on import (before React mounts) to prevent FOUC

## Design System (`App.css`)
- Tokens: `--w-ink-1` (#111827) → `--w-ink-6` (#d1d5db) for light; inverted for dark
- Classes: `w-display`, `w-heading`, `w-title-soft/bold`, `w-sub-soft/bold`, `w-period`, `w-body`, `w-caption`, `w-label`, `w-muted`, `w-dot`/`w-dot-active`
- `w-title-bold` and `w-sub-bold` use `var(--w-accent)` for accent-tinted text
- `w-dot-active` uses `var(--w-accent)`
- Dark mode overrides: `[data-mode="dark"]` selectors patch hardcoded Tailwind classes (bg-white, border-gray-*, text-gray-*, inputs)

## Key Files
```
src/
  App.jsx              — root, mode toggle, settings overlay
  App.css              — design tokens, typography classes, grid overrides, dark mode patches
  theme.js             — ACCENT_COLORS, applyTheme(), useTheme()
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
    calendar/          — BS/AD, event dots, today = accent fill + white text
    weather/           — OpenWeatherMap API, geolocation, VITE_OWM_API_KEY in .env
  components/
    Settings.jsx       — global settings panel: Light/Dark toggle, accent swatches, language
```

## Critical Rules
- **Modals** → `createPortal(…, document.body)` — CSS `transform` in grid breaks `position:fixed`
- **Cross-widget sync** → module-level cache + `dispatchEvent(new Event('widget_events_changed'))`. Never mutate inside `setState(prev =>)` when dispatching (StrictMode double-invoke = double event)
- **Drag buttons** → `onMouseDown={e => e.stopPropagation()}` on any button inside a widget
- **Per-breakpoint layout** → save `allLayouts` (2nd arg of `onLayoutChange`) not just current
- **Icons** → react-bootstrap-icons only
- **Theme** → always use `var(--w-accent)` / `var(--w-ink-*)` — never hardcode colors in widgets

## localStorage Keys
- `language`, `showWidgets`
- `app_accent` — accent color name (e.g. `"Blueberry"`)
- `app_mode` — `"light"` or `"dark"`
- `widgetSettings_${widgetId}` — per-widget settings
- `widget_events` — events array `{ id, title, startDate, startTime, endDate, endTime }`
- `widget_grid_layouts` — `{ lg: [...], md: [...], ... }` per breakpoint

## Event Shape
`{ id, title, startDate, startTime, endDate, endTime }` — dates `YYYY-MM-DD`, times `HH:MM` 24h

## Commands
- `npm run dev` — Vite dev server
- `npm run build` — extension build


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
