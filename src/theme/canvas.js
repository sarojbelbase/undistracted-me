// ─── Canvas Mode Token System ──────────────────────────────────────────────────
//
// Single source of truth for ALL hardcoded color values used in canvas-mode
// widget components, shared UI components, and the settings panel.
//
// Philosophy:
//   • Canvas mode is light-by-default but supports dark mode and glass/flat style.
//   • Every component that needs a mode-aware color MUST source it here.
//   • CSS vars (var(--card-*), var(--w-*)) are the primary mechanism — these
//     constants supplement where CSS vars alone aren't sufficient (e.g. mode-
//     dependent JSX style objects, JS-only logic, semantic fixed colors).
//
// Usage patterns:
//   • Pure CSS vars in style={{}} → use var(--card-bg), var(--w-ink-2) etc.
//   • Mode-aware JSX values       → use CANVAS_ICON_COLOR(isDark), CANVAS_INPUT_BG(...)
//   • Semantic fixed colors       → OCCASION_ANNIVERSARY_COLOR, NOTES_BUTTON_SHADOW
//
// Parallel: src/components/FocusMode/theme.jsx handles the Focus Mode dark-only
// system. This file handles the canvas mode bidirectional light/dark system.

// ── Dividers and structural hairlines ──────────────────────────────────────────
// These "dual-mode" rgba values read correctly on both glass and flat surfaces.
// They work because the alpha blends with the surface to produce consistent
// contrast on both #fff (flat) and rgba(255,255,255,0.44) (glass).

/** Section hairline / modal inner divider — works on glass and flat */
export const CANVAS_DIVIDER = 'rgba(0,0,0,0.1)';
export const CANVAS_DIVIDER_DARK = 'rgba(255,255,255,0.12)'; // inverted divider for dark canvas

/** Hover overlay for interactive cells (calendar days, list rows) */
export const CANVAS_HOVER_OVERLAY = 'rgba(0,0,0,0.06)';

/** Cancel / secondary button border — gentle, readable on any surface */
export const CANVAS_BORDER_SOFT = 'rgba(0,0,0,0.12)';

// ── Overlay/cluster icon tints (mode-aware helpers) ──────────────────────────
// Used for icon buttons that float directly on the canvas (FocusModeButton,
// ControlCluster) where the background surface varies between glass / flat × dark.
// Helpers take a boolean `isDark` and return the correct rgba.

/** Default icon color — muted, gentle on the canvas background */
export const CANVAS_ICON_COLOR = (isDark) =>
  isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.5)';

/** Active/focused icon color — strong, pressed / open state */
export const CANVAS_ICON_ACTIVE = (isDark) =>
  isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.8)';

/** Expand-label text inside pill buttons (FocusModeButton label) */
export const CANVAS_ICON_LABEL = (isDark) =>
  isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)';

/** Muted moon / status icon — softer than ICON_COLOR, used for icon-only cues */
export const CANVAS_ICON_MUTED = (isDark) =>
  isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)';

// ── Input surface (SettingsInput, Input) ─────────────────────────────────────
// Each setting input uses a glass-pill container whose background/border changes
// based on the combined glass×mode state. These helpers centralise those values.

/**
 * Input wrapper background (glass-pill container).
 * @param {boolean} isDark    - true when mode is dark
 * @param {boolean} isGlass   - true when cardStyle is glass
 */
export const CANVAS_INPUT_BG = (isDark, isGlass) => {
  if (isDark && isGlass) return 'rgba(255,255,255,0.12)';
  if (isDark) return 'var(--panel-bg)';
  if (isGlass) return 'rgba(255,255,255,0.45)';
  return 'var(--panel-bg)';
};

/**
 * Input wrapper border.
 * @param {boolean} isDark    - true when mode is dark
 * @param {boolean} isGlass   - true when cardStyle is glass
 */
export const CANVAS_INPUT_BORDER = (isDark, isGlass) => {
  if (isDark && isGlass) return '1px solid rgba(255,255,255,0.16)';
  if (isDark) return '1px solid var(--card-border)';
  if (isGlass) return '1px solid rgba(0,0,0,0.09)';
  return undefined;
};

/** Input text / WebkitTextFillColor */
export const CANVAS_INPUT_TEXT = (isDark) =>
  isDark ? 'rgba(255,255,255,0.88)' : 'var(--w-ink-1)';

/** Input leading icon color */
export const CANVAS_INPUT_ICON = (isDark) =>
  isDark ? 'rgba(255,255,255,0.38)' : 'var(--w-ink-5)';

/** Input leading prefix text color */
export const CANVAS_INPUT_PREFIX = (isDark) =>
  isDark ? 'rgba(255,255,255,0.28)' : 'var(--w-ink-6)';

// ── TabRow component (dark-context overrides) ─────────────────────────────────
// TabRow accepts a `dark` prop for rendering inside dark-glass contexts
// (BackgroundPicker, FocusMode dialogs). These token values match that context.

/** TabRow pill track background in dark context */
export const CANVAS_TAB_BG_DARK = 'rgba(255,255,255,0.07)';

/** TabRow pill track border in dark context */
export const CANVAS_TAB_BORDER_DARK = 'rgba(255,255,255,0.10)';

/** Inactive tab label color in dark context */
export const CANVAS_TAB_INACTIVE_DARK = 'rgba(255,255,255,0.55)';

/** Tab hint/caption color in dark context (non-selected) */
export const CANVAS_TAB_HINT_DARK = 'rgba(255,255,255,0.38)';

// ── Clock widget ─────────────────────────────────────────────────────────────
/** Subtle divider above extra timezone clocks — works on glass and flat */
export const CLOCK_TIMEZONE_DIVIDER = 'rgba(0,0,0,0.1)';

// ── Notes widget (macOS traffic-light controls) ───────────────────────────────
/** Inset shadow on the circular traffic-light control buttons */
export const NOTES_BUTTON_SHADOW = 'inset 0 0 0 0.5px rgba(0,0,0,0.18)';

/** Symbol icon color on hovered traffic-light buttons */
export const NOTES_ICON_COLOR = 'rgba(0,0,0,0.55)';

// ── FaviconIcon widget ────────────────────────────────────────────────────────
/** Text-shadow for the letter-mode favicon fallback */
export const FAVICON_TEXT_SHADOW = '0 1px 4px rgba(0,0,0,0.18)';

// ── Semantic occasion / event colors ─────────────────────────────────────────
// Fixed brand colors — not theme-adaptive, chosen for emotional resonance.
// Birthday uses var(--w-accent) so it adapts to user's chosen accent.

/** Anniversary (heart) — warm rose pink */
export const OCCASION_ANNIVERSARY_COLOR = '#e05c8a';

/** Special / other (star) — warm amber gold */
export const OCCASION_SPECIAL_COLOR = '#f59e0b';

// ── Convenience objects (for spreading into style props) ─────────────────────

/**
 * Full input style for dark-context bare inputs (Input component).
 * Spread into the inner <input> element's style prop.
 */
export const CANVAS_INPUT_DARK_STYLE = {
  color: 'rgba(255,255,255,0.88)',
  WebkitTextFillColor: 'rgba(255,255,255,0.88)',
};

/**
 * Convenience object for modal cancel buttons.
 * Works on any canvas surface (glass or flat, light or dark).
 */
export const CANVAS_CANCEL_BTN_STYLE = {
  border: `1px solid ${CANVAS_BORDER_SOFT}`,
  background: 'transparent',
};
