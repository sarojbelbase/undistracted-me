# Building a New Widget

The single source of truth for adding a widget to Undistracted Me. When a task
says "make a new widget" (or "add a widget"), follow this document start to
finish. It encodes the lessons from the Pocket widget, which was spec'd too
large, built with hand-rolled UI and then needed a long series of retroactive
refactors to unify it onto the shared primitives. The whole point of this
document is to make that never happen again: build on the shared primitives
from the first commit, keep Phase 1 genuinely minimal and stop when it is done.

This document is prescriptive. It overrides whatever an AI agent might
otherwise improvise. When a guideline here conflicts with a task prompt, this
document wins, and the conflict should be raised rather than silently ignored.

---

## 0. The workflow (read first)

The Pocket build defined a working rhythm. Keep it:

1. **Investigate before writing code.** Read, at minimum:
   - `app/widgets/index.js`, `app/widgets/components.js`,
     `app/widgets/WidgetCatalog.jsx` (registration + catalog icon map).
   - An existing similar widget as a template. For a list/feed widget, the
     RSS widget (`app/widgets/rss/`). For a CRUD widget, the Expense widget
     (`app/widgets/expense/`). For a card widget, the Countdown widget.
   - The shared primitives in `app/components/ui/` (see section 4) so you know
     what already exists and must be reused.
   - `app/constants/emptyStates.js`, `app/constants/defaults.js`,
     `app/constants/storageKeys.js` for the copy, defaults and key patterns.
2. **Reply with a short plan** (at most 15 lines): what you found, what you will
   reuse, any conflicts. Ask at most 3 questions and only if truly blocking;
   otherwise state your assumption and proceed.
3. **Implement the bare minimum completely, then stop.** Give a summary and a
   manual test checklist. Do not start any second phase until the user says so.

Rules that apply to every widget build:

- Small focused edits. No wholesale rewrites of existing files.
- No new dependencies unless unavoidable (justify each in one line).
- No hard-coded colors, radii, shadows, fonts or spacing. Use theme tokens only
  (`var(--w-*)`, `var(--card-*)`).
- Do not change how existing widgets behave.
- Match the repo's existing code style, naming and folder conventions.
- Calm, sentence-case copy. No exclamation marks, no emoji as icons, no Oxford
  comma, no em-dashes (use a comma, colon or period instead).

---

## 1. What the bare minimum is

"Bare minimum" for a new widget means a working card on the canvas with:

1. A `config.js` registering it (type, title, category, icon, description,
   grid position, `enabled: true`).
2. A `Widget.jsx` exporting `Widget` that renders inside `BaseWidget`.
3. An empty state, using the shared `EmptyState` component and copy registered
   in `EMPTY_STATES`.
4. Settings only if the widget actually has settings. When it does, use the
   shared settings primitives. When it does not, pass nothing and rely on
   `BaseWidget`'s built-in remove/duplicate menu.
5. Every piece of UI built from shared primitives, never hand-rolled.

It does **not** include, in Phase 1: an expanded/full view, import/export,
cross-device sync, a service-worker integration, a context menu or any
"smart" derived views. Those are later phases. The Pocket spec folded the
context menu, service worker, expanded view, search, folders, import/export
and unit tests all into one "Phase 1", which is why it ballooned. A new widget
should land as a card first, then grow.

If a feature is in the task prompt but not in the bare minimum, treat it as a
later phase and say so explicitly in the plan.

---

## 2. File anatomy

Every widget lives in `app/widgets/<name>/` (folder name = `type` string,
lowercase camelCase). The canonical set of files:

```
app/widgets/<name>/
  config.js       : metadata only: type, title, category, icon, description,
                     grid position, enabled. No component imports (see below).
  Widget.jsx      : export const Widget = ({ id, onRemove }) => …; the card.
  Settings.jsx    : optional; the settings panel body, passed as settingsContent.
  utils.js        : optional; pure, unit-tested helpers (no React, no storage).
  constants.js    : optional; local constants (presets, options, defaults).
  <Add…>.jsx      : optional; an add/edit dialog, built on Modal + AddDialogHeader.
  Expanded/       : optional; expanded view, a later phase.
  use<Name>.js    : optional; the data-access hook for the widget.
```

`config.js` is metadata-only. It must **not** import the `Widget` component.
The component registry lives in `app/widgets/components.js` specifically to
break the `config.js -> Widget.jsx -> config.js` cycle without lazy loading.
Widgets render eagerly, so no `React.lazy` anywhere (see section 9).

---

## 3. Registration: the 6 touchpoints

A new widget is not "wired up" until all of these are done. Miss one and the
widget silently won't appear, won't theme or won't remember settings.

1. **`app/widgets/index.js`**: `import <name>Config from "./<name>/config"` and
   add `<name>Config` to the `WIDGET_REGISTRY` array. `WIDGET_TYPES` is derived
   automatically from the registry, so do not hand-edit it.
2. **`app/widgets/components.js`**: `import { Widget as <Name>Widget } from
   "./<name>/Widget"` and add `<name>: <Name>Widget` to `WIDGET_COMPONENTS`.
3. **`app/widgets/WidgetCatalog.jsx`**: add the icon component to the
   `WIDGET_ICONS` map. `config.icon` is a **string name** (for example
   `"WalletFill"`, `"PocketIcon"`) resolved through this map; the string must
   match a key here. react-bootstrap-icons components for standard icons,
   custom SVG components under `app/assets/svg/` otherwise.
4. **`app/constants/defaults.js`**: if the widget has settings, add a
   `<name>: { …defaults }` entry to `WIDGET_SETTINGS_DEFAULTS`. Keep this file
   pure (it is imported transitively by `bg.js`).
5. **`app/constants/emptyStates.js`**: add the empty-state copy under
   `EMPTY_STATES.<name>` (section 6).
6. **`app/styles/main.scss`**: if the widget has its own stylesheet, add
   `@use "widgets/<name>";` in the `widgets/` block (after `expense`). Prefer
   reusing existing primitives over adding a new stylesheet.

Additional touchpoints only when the feature genuinely needs them:

- **`app/constants/storageKeys.js`**: add `STORAGE_KEYS` entries only if the
  widget owns dedicated storage keys.
- **`public/manifest.json` + `scripts/patch-manifest-firefox.mjs`**: only when
  the widget needs new permissions, host permissions, content scripts or a
  background integration (Pocket needed `contextMenus` + `activeTab`, and a
  `contextMenus` -> `menus` mapping for Firefox).

---

## 4. Shared UI primitives

Everything in `app/components/ui/` is a reusable, theme-aware primitive. A new
widget should reach for these first and only add custom JSX when nothing fits.
Hand-rolling a button, a dropdown, an empty state, a settings row or an
import/export block is a bug, not a choice.

| Primitive | Use it for |
|---|---|
| `Button` | Any labelled button. Variants: `primary`, `soft` (tinted chip, fills accent on hover), `secondary`, `ghost`, `danger`. Sizes `md` / `sm`. |
| `IconButton` | Square icon-only button. `label` doubles as aria-label + tooltip. `size` `md`/`sm`, `accent` for the primary circular action. |
| `EmptyState` | Every empty/no-data face. `icon`, `title`, `text`, `action`, `size="sm"` on cramped cards. |
| `SettingsSection`, `SettingsField`, `SettingsToggleRow` | The settings panel layout + typography (label-on-top, toggle-on-row). |
| `Select` | The themed dropdown (custom menu, not the native OS list). Used for currency, folder, unit, style pickers. |
| `Input` | The single text input. `pill` mode wraps it in a glass/flat-aware field. |
| `Toggle` | iOS-style on/off switch. `ariaLabel` required. |
| `SegmentedControl` | Multi-option radio-style picker (tabs, view modes, period pickers). |
| `PillButton` | Toggle pill with active/inactive states (presets, chips). |
| `ConfirmButton` | Destructive actions that need a second click (remove, delete, clear). |
| `Modal` | Any modal shell (portals to `document.body`). |
| `Popup` | Anchor-positioned floating tooltip/menu. |
| `AddDialogHeader` | The header of every add/edit dialog (accent icon tile + title + subtitle + ✕). Required, not optional. |
| `UnifiedAddDialog` | The combined add dialog for Events/Countdowns/Occasions. Reuse for calendar-like entries. |
| `DataTransfer` | The import/export + sample + clear-all block in a settings Data section. |
| `WidgetHeader` | The consistent card header (icon + title + count + actions). |
| `WidgetHeaderFull` | The expanded-view header (same structure, larger scale + dismiss). |
| `IntegrationRow` | OAuth connect/disconnect row (Google Calendar, Google Contacts, Spotify). |
| `Snackbar`, `TooltipBtn`, `TintedChip`, `Divider`, `FaviconIcon`, `ScrollFade`, `RingProgress`, `Sparkline`, `EventRow` | As named. Check `app/components/ui/` for the full list before inventing one. |

### 4.1 The tinted-chip action button

Empty-state action buttons (the "get started" buttons) use
`<Button variant="soft" size="sm">`. At rest it is an accent-tinted chip
(`14%` accent wash, accent text, `30%` accent border); on hover it fills solid
accent with `accent-fg` text. It reads as calm, not loud. One action button per
empty state, at most. Do not stack two full-width buttons in an empty state.

---

## 5. Spacing and typography

- Use the `w-*` typography classes (`w-heading`, `w-title-soft`, `w-sub-soft`,
  `w-body`, `w-caption`, `w-label`, `w-muted`) rather than raw font sizes.
- Spacing follows a 4px/8px rhythm. Section padding in cards is `px-4 pt-3 pb-2`
  for headers, `px-4` for body, with `gap` values in multiples of 4 (`gap: 8`,
  `gap: 12`).
- Card text minimums: titles `0.8125rem`, body `0.75rem`, captions `11px` or
  `10.5px`. Never go below ~10px. Read `app/styles/_ui.scss` for the exact
  primitive sizes before overriding.
- Colors always via tokens (`--w-ink-1..6` for text hierarchy, `--w-accent`,
  `--w-accent-fg`, `--w-success`, `--w-danger`, `--card-bg`, `--card-border`,
  `--panel-bg`, `--w-surface-2`). No hex, no rgba literals except the
  `color-mix(...)` tint pattern already used in the codebase.

---

## 6. Empty states

Every widget with a "no data" face renders `<EmptyState>` and sources its copy
from `EMPTY_STATES` in `app/constants/emptyStates.js`. One title, one sentence,
at most one action button. No numbered steps, no emoji, no exclamation marks.

```
EMPTY_STATES.<name>.<key> = { title: string, text: string }
```

- Widget cards (cramped faces) use `size="sm"`.
- Modal/expanded views use the default size.
- Dynamic copy (a search query, a folder name) is interpolated at the call
  site and stays out of the map.
- The action button is `<Button variant="soft" size="sm">`, at most one.

---

## 7. Settings

Settings panels are passed to `BaseWidget` as `settingsContent` (a JSX node or a
`(onClose) => JSX` function). The panel body uses the shared settings primitives
for layout and typography:

- Group fields with `SettingsSection` (titled group).
- Label-on-top controls with `SettingsField`.
- On/off rows with `SettingsToggleRow`.
- Dropdowns with `Select`, text with `Input pill`, switches with `Toggle`,
  multi-option with `SegmentedControl`.
- A Data section (import/export) uses `DataTransfer`.
- OAuth integration uses `IntegrationRow`.

Read/write settings via `useWidgetSettings(id, defaults)` from
`app/widgets/useWidgetSettings.js`. Never read `widgetSettings_${id}` from
`localStorage` directly in new code.

---

## 8. Add / edit dialogs

Any "Add …" or "Edit …" dialog must inherit the shared
`app/components/ui/AddDialogHeader` (accent icon tile + title + subtitle + ✕).
Do not hand-roll dialog headers. For calendar-like entries (events, countdowns,
occasions) prefer `UnifiedAddDialog` and render only the form + footer inside
it. All modals render through `Modal`, which portals to `document.body`.

---

## 9. State, storage and threading

- Per-widget settings: `useWidgetSettings(id, defaults)`, backed by Zustand
  (`useWidgetInstancesStore.widgetSettings`).
- Widget data (items, folders, notes) goes through a dedicated store module or
  hook, never through UI components directly. Pocket's `pocketStore` is the
  template: one module owns all `chrome.storage.local` / `localStorage` access
  with `get`, `subscribe` and mutation functions, and pure functions
  (`classifyKind`, `search`, `groupBySite`) are unit-tested separately.
- Tokens and PII (Google, Spotify, calendar, contacts) go in
  `chrome.storage.local`, never `localStorage`.
- Timers: use `onClockTick(fn)` from `app/utilities/sharedClock.js` for
  second/minute-aligned updates. Never a per-component `setInterval(fn, 1000)`.
  Minute-only updates can use `setInterval(…, 60_000)` (see `dateToday`), but
  second-ticking widgets must use `onClockTick`.
- Google auth: trigger OAuth through `useGoogleAccountStore.connect()`, never
  `getGoogleAuthToken(true)` straight from UI.
- No `React.lazy` or code splitting. Widgets render eagerly; the whole bundle
  loads once. Optimize with memoization, virtualization and shared components.
- No `setState` inside another `setState` updater, and no localStorage/ref
  writes during render.
- Persist per-breakpoint layouts with `allLayouts` from `onLayoutChange` in the
  grid, not in the widget.

---

## 10. Styling (SCSS)

If a widget needs its own styles, `app/styles/widgets/_<name>.scss` with BEM
class names (`.<name>-…`), first line `@use 'common' as *;` to get the shared
mixins (`skeleton-bone`, `text-truncate`, `dot-nav-dot`). All colors reference
CSS custom properties so light/dark/accent/card-style all work automatically.
Respect `prefers-reduced-motion`. Prefer extending existing primitives over new
CSS; only add a stylesheet for genuinely widget-specific layout.

---

## 11. Definition of done

Before calling a new widget "done" for a phase, confirm all of:

- [ ] All 6 registration touchpoints complete (section 3).
- [ ] Widget renders on the canvas at every breakpoint, no clipping.
- [ ] Empty state uses `EmptyState` + `EMPTY_STATES` + `variant="soft"` action.
- [ ] Settings (if any) use the shared primitives and `useWidgetSettings`.
- [ ] Add/edit dialogs (if any) use `AddDialogHeader` and portal via `Modal`.
- [ ] Theme-aware: correct in light, dark and across accent colors.
- [ ] Keyboard focus states visible; destructive actions use `ConfirmButton`.
- [ ] `bun run build` green.
- [ ] `bun run test:unit` green, with new unit tests for any pure utils.
- [ ] No new console errors, no new permissions without a note.

---

## 12. Anti-patterns (the Pocket lessons)

- Do not hand-roll a button, dropdown, empty state, settings row or
  import/export block. Use the primitives.
- Do not write a giant multi-phase spec as "Phase 1". Land the card first.
- Do not import the `Widget` component in `config.js` (breaks the cycle).
- Do not use `React.lazy`, em-dashes, Oxford commas or exclamation marks.
- Do not read/write `widgetSettings_${id}` or raw storage from a UI component.
- Do not use a per-component `setInterval(fn, 1000)` for clock-driven UI.
- Do not hardcode hex colors or radii; tokens only.
