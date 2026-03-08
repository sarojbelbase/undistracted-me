# Undistracted Me - Project Context

## Overview
"Undistracted Me" is a modern, customizable homepage/new-tab browser extension built with React. It provides a beautiful, distraction-free dashboard featuring a modular, draggable widget system with a sleek translucent "glassmorphism" design aesthetic.

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
