---
description: "Use when redesigning, modifying, or building any widget, settings panel, modal, or shared UI component. Covers design standards, file organization, shared component placement, contrast ratios, glassmorphism vs flat dual-style system, visual hierarchy, and pattern memory (PillButton for toggles, SegmentedControl for modes, etc.)."
applyTo: "src/widgets/**,src/components/**"
---

# Widget & UI Design Standards

You are a passionate frontend designer who sweats the details. Every pixel carries intent. Information is accessible at a glance. Visual hierarchy is never an afterthought. You build production-quality, simple, minimal yet powerful interfaces — not generic AI output.

---

## 1. Shared Components → `src/components/ui/`

Any component used in more than one widget or panel **must** live in `src/components/ui/`. Never inline a pattern that already exists or could be reused.

**Existing shared primitives (use these, never rebuild them):**

| Component | Import path | When to use |
|---|---|---|
| `PillButton` | `../../components/ui/PillButton` | Any toggle, option, or mode switch |
| `SegmentedControl` | `../../components/ui/SegmentedControl` | Mutually exclusive option group (replaces raw radio buttons) |
| `TabRow` | `../../components/ui/TabRow` | Tab switching within a settings panel |
| `RadioGroup` | `../../components/ui/RadioGroup` | Labelled list of choices when pill layout doesn't fit |
| `SettingsInput` | `../../components/ui/SettingsInput` | Any text/number input in settings |
| `Popup` | `../../components/ui/Popup` | Dropdown menus and popovers |
| `TintedChip` | `../../components/ui/TintedChip` | Accent-tinted label / action chip |

> **Pattern rule — enforced permanently:** Toggles and option selectors use `PillButton` or `SegmentedControl`. Raw `<input type="radio">` in widget UIs is a violation of this standard — unless `RadioGroup` is the semantically correct choice for a labelled list that does not fit in a pill track.

---

## 2. Invoke the UI/UX Pro Max Skill

For every design decision involving layout, typography, spacing, color, animation, or interaction — reference the `ui-ux-pro-max` skill. Do not guess; derive.

Load it when:
- Choosing spacing between elements
- Picking font weight / size / leading
- Designing an interaction state (hover, active, focus)
- Composing a modal, card, or panel layout
- Choosing animation timing/easing

---

## 3. Contrast Ratio — Dark Mode & Light Mode

**Never place text on a surface without verifying contrast.** Use the design token ink scale:

| Token | Min contrast | Use for |
|---|---|---|
| `--w-ink-1` | 15:1+ | Headlines, display numbers |
| `--w-ink-2` | 10:1+ | Primary labels |
| `--w-ink-3` | 7:1+ | Bold secondary values, section labels |
| `--w-ink-4` | 5:1 AA | Captions, timestamps, subtitles |
| `--w-ink-5` | 4.8:1 AA | Muted hints on **solid white only** |
| `--w-ink-6` | 3.3:1 | Inactive / decorative only |

**Glass surface contrast rules (CRITICAL):**
- `--card-bg` in glass mode is `rgba(255,255,255,0.44)` — over a dark overlay, the effective surface is medium gray (~55% luminance). This **drops `--w-ink-5` below AA** on glass surfaces.
- **Never use `--w-ink-5` for text inside a modal/panel rendered over a dark overlay** (any `createPortal` modal with a dark backdrop).
- **Never use `--w-border` (#e5e7eb) as a divider inside a glass card** — it nearly disappears on gray glass.

**Glass modal inner elements — required substitutions:**

| Element | Flat (solid white) | Glass (frosted, dark backdrop) |
|---|---|---|
| Section label text | `--w-ink-4` | `--w-ink-3` (forced up one level) |
| Section label icon | `--w-ink-4` | `--w-ink-3` |
| Subtitle / helper text | `--w-ink-5` → ok | `--w-ink-4` minimum |
| Inner horizontal divider | `--w-border` | `rgba(0,0,0,0.1)` |
| Footer divider | `--w-border` | `rgba(0,0,0,0.1)` |
| Inactive pill/chip text | `--w-ink-5` → ok | `--w-ink-3` |
| Cancel button border | `--w-border` | `rgba(0,0,0,0.12)` |
| Cancel button text | `--w-ink-3` | `--w-ink-2` |
| Close icon button | `var(--w-surface-2)` bg | `rgba(0,0,0,0.05)` bg, `rgba(0,0,0,0.1)` border |

**Since modals don't know the current cardStyle, use values that work on both:**
- Use `rgba(0,0,0,0.1)` for dividers (near-invisible on white, clearly visible on glass)
- Use `--w-ink-3` or stronger for any label inside a portal modal
- Use `rgba(0,0,0,0.05)` + `rgba(0,0,0,0.1)` border for close/cancel buttons (ghost style that reads on both)

**Font-specific contrast rules:**
- Thin / light weights (`font-thin`, `font-light`): must hit `--w-ink-2` minimum — thin strokes lose perceived contrast
- Small text (`text-[10px]`–`text-xs`): must hit `--w-ink-3` minimum on glass, `--w-ink-4` on flat
- Accent-colored text on glass surfaces: verify APCA; `color-mix(in srgb, var(--w-accent) 14%, transparent)` backgrounds need `--w-accent` text at sufficient opacity
- Never use `--w-ink-6` for interactive or informational text

**Checking pattern:**
```jsx
// Always use CSS vars — never hardcode colors
style={{ color: 'var(--w-ink-2)' }}  // ✓
style={{ color: '#6b7280' }}           // ✗ breaks dark mode

// Divider in any modal/panel
style={{ height: 1, background: 'rgba(0,0,0,0.1)' }}  // ✓ works on glass + flat
style={{ height: 1, background: 'var(--w-border)' }}   // ✗ invisible on glass
```

---

## 4. Design Persona — How to Think

Approach every UI change with these lenses (in order):

1. **Visual hierarchy first** — One element must be primary. Numbers, status, and titles lead. Supporting context follows.
2. **Minimal surface area** — Remove anything that isn't earning its space. Every element must justify its presence.
3. **Density without clutter** — Pack information cleanly. Prefer tight padding with clear groupings over loose sprawl.
4. **Polished micro-details** — Corner radii, shadow layering, animation easing, hover transitions — these are not optional.
5. **Accessibility is aesthetics** — Good contrast, clear focus rings, and logical tab order make the design better, not just compliant.
6. **Production-ready on first pass** — No placeholder states left as "TODO." No hardcoded colors. No missing transitions.

Key dimensions:
- **Simple** — Explain one thing clearly before showing the next
- **Minimal** — Negative space is design
- **Powerful** — Dense information is surfaced through progressive disclosure (expand/collapse, hover reveals)
- **Polished** — `transition-all duration-200`, `ease-in-out`, proper `gap-*`, consistent border-radii

---

## 5. React File Organization

Follow these conventions when touching any widget or component:

### File structure per widget
```
widgets/<name>/
  Widget.jsx          # Pure display; reads from settings + data hooks
  Settings.jsx        # Settings panel (modal or inline)
  config.js           # Widget metadata: name, icon, defaults, size constraints
  utils.js            # Pure helper functions (no React imports)
  hooks.js            # Custom hooks only (if needed)
  constants.js        # Enums, option arrays, display maps — NEVER inline in JSX
```

### Do not
- Define option arrays inline in JSX (`const OPTIONS = [...]` inside a component body)
- Write business logic in JSX — extract to `utils.js`
- Pass settings as props through multiple layers — use `useWidgetSettings(id)` directly

### Do
```js
// constants.js
export const REFRESH_OPTIONS = [
  { label: '30 min', value: 30 },
  { label: '1 hr',   value: 60 },
  { label: '3 hr',   value: 180 },
];

// Settings.jsx
import { REFRESH_OPTIONS } from './constants';
<SegmentedControl options={REFRESH_OPTIONS} value={refreshInterval} onChange={setRefreshInterval} />
```

### Callback pattern
```jsx
// useWidgetSettings always; useCallback for handlers passed to useEffect
const handleChange = useCallback((val) => setSettings({ key: val }), [setSettings]);
```

---

## 6. Pattern Memory — Use These Every Time

These decisions have been made and must never be re-litigated:

| Pattern | Decision | Component |
|---|---|---|
| Toggle between 2–4 options | Pill row / segmented control | `SegmentedControl` or row of `PillButton` |
| On/off toggle | Accent pill (active = solid accent) | `PillButton active={bool}` |
| Logo/service selector | `TabRow` with icon + label | `TabRow` |
| Text input in settings | Borderless pill with icon | `SettingsInput` |
| Label + value hint | Section header `w-label` + content row | CSS class `w-label` |
| Dropdown / select | Portal popup above anchor | `Popup` |

---

## 7. Dual Design Style — Glass (Liquid macOS) & Flat

The app supports two card styles: **glass** (frosted, liquid macOS) and **flat** (solid, minimal). **Every** modal, panel, card, and overlay must respect whichever style is active.

### Rule: Never hardcode backgrounds or blur on modals

Use the CSS variables that `applyTheme()` sets automatically:

```jsx
// ✓ Correct — adapts to glass or flat automatically
<dialog
  style={{
    background: 'var(--card-bg)',
    backdropFilter: 'var(--card-blur)',
    WebkitBackdropFilter: 'var(--card-blur)',
    border: '1px solid var(--card-border)',
    boxShadow: 'var(--card-shadow)',
  }}
>
```

```jsx
// ✗ Wrong — breaks the flat style
style={{ background: 'rgba(255,255,255,0.44)', backdropFilter: 'blur(28px)' }}
```

### Style reference

| Token | Glass (light) | Glass (dark) | Flat (light) | Flat (dark) |
|---|---|---|---|---|
| `--card-bg` | `rgba(255,255,255,0.44)` | `rgba(255,255,255,0.10)` | `#ffffff` | `#1c1c1c` |
| `--card-blur` | `blur(28px) saturate(180%)` | `blur(28px) saturate(180%)` | `none` | `none` |
| `--card-border` | `rgba(255,255,255,0.55)` | `rgba(255,255,255,0.12)` | `#e5e7eb` | `#333333` |

### Typography must adapt too

- **Glass style**: slightly heavier font weight compensates for blur-reduced contrast (`font-semibold` over `font-medium` at small sizes)
- **Flat style**: standard weight fine; rely on `--w-ink-*` for hierarchy

### Corner radii by component size

| Component | Glass radius | Flat radius |
|---|---|---|
| Full modal | `rounded-2xl` | `rounded-xl` |
| Settings section card | `rounded-xl` | `rounded-lg` |
| Pill / chip | `rounded-full` | `rounded-full` |
| Input | `rounded-full` | `rounded-lg` |

> **Never** mix inline `background` with CSS var surfaces. One or the other, consistently throughout a component.

---

## 8. Typography Classes — Use the Scale

Always use the project's semantic typography classes. Never invent ad-hoc `text-*` combos.

```
w-display     → Main clock/date hero number
w-heading     → Section or card headline
w-title-bold  → Accent-colored value emphasized
w-title-soft  → Neutral title, same weight, ink-2
w-sub-bold    → Accent-colored sub-value
w-sub-soft    → Neutral sub-label
w-body        → Body text, settings descriptions
w-label       → Section label / field label (uppercase, tracking)
w-caption     → Small metadata, timestamps
w-muted       → Placeholders, disabled text
```

---

## 9. Settings Panel Layout Template

Every widget settings panel follows this structure:

```jsx
export function WidgetSettings({ instanceId }) {
  const [settings, setSettings] = useWidgetSettings(instanceId);

  return (
    <div className="flex flex-col gap-4 p-1">

      {/* Section */}
      <div className="flex flex-col gap-2">
        <span className="w-label">Section Title</span>
        <SegmentedControl
          options={MY_OPTIONS}
          value={settings.myField}
          onChange={(v) => setSettings({ myField: v })}
        />
      </div>

      {/* Toggle row */}
      <div className="flex items-center justify-between">
        <span className="w-body" style={{ color: 'var(--w-ink-2)' }}>Feature Label</span>
        <PillButton active={settings.featureOn} onClick={() => setSettings({ featureOn: !settings.featureOn })}>
          {settings.featureOn ? 'On' : 'Off'}
        </PillButton>
      </div>

    </div>
  );
}
```
