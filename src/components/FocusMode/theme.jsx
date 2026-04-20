// ─── Focus Mode Dark Glass Token System ───────────────────────────────────────
//
// Focus Mode ALWAYS renders over a dark photo / orb backdrop.
// Every color value in every FocusMode/* component MUST originate here.
//
// Card surface (glass vs flat) follows the user's canvas cardStyle preference,
// but BOTH variants are always dark — ink/text is always white-on-dark.
//
// Rules:
//   • Never reference --card-*, --w-ink-*, --w-surface-* CSS vars in FocusMode
//     components — those track canvas mode state which can be light.
//   • FM_CARD_* constants are CSS var wrappers — resolved from custom properties
//     set via getFMCardVars(cardStyle) on the FocusMode root div.
//   • Elements floating directly on the photo (clock, greeting, world clock)
//     are luminance-adaptive — use getPhotoTokens(centerOnDark).
//   • The search bar pill/dropdown switches palettes on luminance — use getTokens(dark).
//   • dialog/shared.jsx, panels/Tasks.jsx etc. import FM_* from here.

// ── Actual card surface values (glass) ────────────────────────────────────────
export const GLASS_CARD_BG = 'rgba(0,0,0,0.38)';
export const GLASS_CARD_BORDER = 'rgba(255,255,255,0.18)';
export const GLASS_CARD_BLUR = 'blur(28px) saturate(180%)';
export const GLASS_CARD_SHADOW = '0 2px 16px rgba(0,0,0,0.28)';

// ── Actual card surface values (flat dark) ─────────────────────────────────────
export const FLAT_CARD_BG = 'rgba(10,10,12,0.82)';
export const FLAT_CARD_BORDER = 'rgba(255,255,255,0.10)';
export const FLAT_CARD_BLUR = 'none';
export const FLAT_CARD_SHADOW = '0 2px 16px rgba(0,0,0,0.40)';

// ── Card surface token exports — CSS var wrappers ──────────────────────────────
// These read from custom properties set on the FocusMode root div by
// getFMCardVars(cardStyle). Using CSS vars lets every component automatically
// respond to the glass/flat toggle without prop threading or context.
export const FM_CARD_BG = 'var(--fm-card-bg)';
export const FM_CARD_BORDER = 'var(--fm-card-border)';
export const FM_CARD_BLUR = 'var(--fm-card-blur)';
export const FM_CARD_SHADOW = 'var(--fm-card-shadow)';
export const FM_CARD_RADIUS = '14px';

// ── Returns inline style object to spread onto the FocusMode root div ──────────
// Call with cardStyle from useSettingsStore (defaults to 'glass').
export function getFMCardVars(cardStyle) {
  if (cardStyle === 'flat') {
    return {
      '--fm-card-bg': FLAT_CARD_BG,
      '--fm-card-border': FLAT_CARD_BORDER,
      '--fm-card-blur': FLAT_CARD_BLUR,
      '--fm-card-shadow': FLAT_CARD_SHADOW,
    };
  }
  return {
    '--fm-card-bg': GLASS_CARD_BG,
    '--fm-card-border': GLASS_CARD_BORDER,
    '--fm-card-blur': GLASS_CARD_BLUR,
    '--fm-card-shadow': GLASS_CARD_SHADOW,
  };
}

// ── Sub-surfaces (interactive elements inside cards) ───────────────────────────
// ordered from lightest (most prominent) to most subtle
export const FM_SURFACE = 'rgba(255,255,255,0.08)';  // btn bg, track bg, icon badges
export const FM_SURFACE_2 = 'rgba(255,255,255,0.14)';  // inputs, raised surface, skeleton
export const FM_BORDER = 'rgba(255,255,255,0.12)';  // hairlines and button borders
export const FM_DIVIDER = 'rgba(255,255,255,0.07)';  // inner section dividers

// Sub-panels (sections inside a dialog)
export const FM_SECTION_CARD_BG = 'rgba(255,255,255,0.06)';
export const FM_SECTION_CARD_BORDER = 'rgba(255,255,255,0.09)';

// ── Ink scale (text on glass — always bright, always white-on-dark) ────────────
export const FM_INK_1 = 'rgba(255,255,255,0.96)';  // primary text / display numbers
export const FM_INK_2 = 'rgba(255,255,255,0.82)';  // secondary text / body
export const FM_INK_3 = 'rgba(255,255,255,0.55)';  // labels / muted
export const FM_INK_4 = 'rgba(255,255,255,0.32)';  // very muted / hints / placeholders

// ── Interactive element tokens ─────────────────────────────────────────────────
export const FM_TOGGLE_THUMB = '#ffffff';
export const FM_TOGGLE_SHADOW = '0 1px 3px rgba(0,0,0,0.4)';
export const FM_TOGGLE_OFF_BG = FM_SURFACE_2;     // rgba(255,255,255,0.14)

export const FM_CLOSE_BG = FM_SURFACE;      // rgba(255,255,255,0.08)
export const FM_CLOSE_BG_HOVER = FM_SURFACE_2;    // rgba(255,255,255,0.14)
export const FM_CLOSE_BORDER = FM_BORDER;       // rgba(255,255,255,0.12)
export const FM_CLOSE_COLOR = 'rgba(255,255,255,0.55)';

// Spinner (loading indicator inside cards)
export const FM_SPINNER_RING = 'rgba(255,255,255,0.10)';
export const FM_SPINNER_ACTIVE = 'rgba(255,255,255,0.60)';

// ── SVG icon stroke defaults ───────────────────────────────────────────────────
export const FM_ICON_STROKE = 'rgba(255,255,255,0.75)';  // search, nav icons
export const FM_ICON_STROKE_MUTED = 'rgba(255,255,255,0.65)';  // star, globe decorative

// ── Semantic status colors ─────────────────────────────────────────────────────
// Success — bright green that reads clearly on dark glass
export const FM_SUCCESS = '#4ade80';
export const FM_SUCCESS_BG = 'rgba(74,222,128,0.14)';
export const FM_SUCCESS_BORDER = 'rgba(74,222,128,0.30)';
export const FM_SUCCESS_DOT = '#22c55e';
export const FM_SYNC_BG = 'rgba(34,197,94,0.12)';
export const FM_SYNC_BORDER = 'rgba(34,197,94,0.28)';

// Danger — muted red that reads on dark glass without alarming
export const FM_DANGER = '#f87171';
export const FM_DANGER_BG = 'rgba(239,68,68,0.09)';
export const FM_DANGER_BORDER = 'rgba(239,68,68,0.22)';
export const FM_DANGER_HOVER_BG = 'rgba(239,68,68,0.16)';
// ── Popover / caret-dropdown panel (Settings gear menu, etc.) ───────────────
export const FM_POPOVER_BG = 'rgba(12,12,16,0.86)';
export const FM_POPOVER_BORDER = 'rgba(255,255,255,0.11)';
export const FM_POPOVER_SHADOW = '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)';

// ── Orb scene ─────────────────────────────────────────────────────────────────
export const FM_ORB_BG = '#060608'; // near-black base for the orb backdrop
// ── Stock direction (financial semantic) ───────────────────────────────────────
export const FM_STOCK_UP = '#4ade80';
export const FM_STOCK_UP_BG = 'rgba(74,222,128,0.12)';
export const FM_STOCK_DOWN = '#f87171';
export const FM_STOCK_DOWN_BG = 'rgba(248,113,113,0.12)';

// ─── FOCUS_THEME ────────────────────────────────────────────────────────────────
// Legacy-compat object — panels use `const t = FOCUS_THEME`.
// All values reference the constants above — no duplication.

export const FOCUS_THEME = {
  card: {
    background: FM_CARD_BG,
    backdropFilter: FM_CARD_BLUR,
    WebkitBackdropFilter: FM_CARD_BLUR,
    border: `1px solid ${FM_CARD_BORDER}`,
    borderRadius: FM_CARD_RADIUS,
    boxShadow: FM_CARD_SHADOW,
  },
  label: FM_INK_3,   // section labels, muted captions
  text: FM_INK_1,   // primary text / numbers
  sub: FM_INK_2,   // secondary text
  track: FM_SURFACE, // progress track / empty state bg
  btnBg: FM_SURFACE,
  btnBorder: FM_BORDER,
  btnColor: FM_INK_1,
  btnIcon: FM_INK_3,
};

// ─── AnimatedCard ────────────────────────────────────────────────────────────────
// Plain passthrough — no animation, no wrapper compositing layer.
// Kept as a named export so callers don't need updating.
// eslint-disable-next-line no-unused-vars
export const AnimatedCard = ({ delay, children }) => <>{children}</>;

// ─── DIALOG_STYLE ────────────────────────────────────────────────────────────────
// Spread onto Modal's `style` prop for all FocusMode portal dialogs.
// Sets the dark-glass card surface AND pins --w-ink-* CSS vars to their dark
// values so any var(--w-ink-*) inside the portal resolves correctly regardless
// of the canvas-level theme.

// ─── DIALOG_STYLE ────────────────────────────────────────────────────────────────
// Spread onto Modal's `style` prop for all FocusMode portal dialogs.
// Portals render outside the FocusMode root div so var(--fm-card-*) won't cascade.
// We always use glass for portals — they float over a dark backdrop and always
// look correct as frosted glass. Flat style applies to the left-panel cards only.
// Also pins --w-ink-* CSS vars so any var(--w-ink-*) inside the portal resolves correctly.

export const DIALOG_STYLE = {
  background: GLASS_CARD_BG,
  backdropFilter: GLASS_CARD_BLUR,
  WebkitBackdropFilter: GLASS_CARD_BLUR,
  border: `1px solid ${GLASS_CARD_BORDER}`,
  boxShadow: GLASS_CARD_SHADOW,
  // CSS var pins (hex values for broadest compatibility)
  '--w-ink-1': '#f2f2f2',
  '--w-ink-2': '#e0e0e0',
  '--w-ink-3': '#c4c4c4',
  '--w-ink-4': '#8e8e8e',
  '--w-ink-5': '#909090',
  '--w-border': FM_BORDER,
  '--w-surface': FM_SURFACE,
  '--w-surface-2': FM_SURFACE_2,
};

// Section divider & card (sub-panel inside a dialog)
export const SECTION_BORDER = `1px solid ${FM_DIVIDER}`;
export const SECTION_CARD_STYLE = {
  borderRadius: 12,
  background: FM_SECTION_CARD_BG,
  border: `1px solid ${FM_SECTION_CARD_BORDER}`,
};

// ─── Photo-luminance adaptive tokens ─────────────────────────────────────────────
//
// Used ONLY for elements floating directly on the photo/orb (not inside a card):
// clock digits, greeting text, and world clock labels.
//
// When the background is dark (centerOnDark = true): bright white text with
// drop shadows for legibility. When it's light: dark text, no shadows.

export function getPhotoTokens(centerOnDark) {
  if (centerOnDark) {
    return {
      // Main clock
      clockColor: 'rgba(255,255,255,0.97)',
      colonColor: 'rgba(255,255,255,0.75)',
      clockShadow: '0 1px 3px rgba(0,0,0,0.50), 0 2px 18px rgba(0,0,0,0.28)',
      // Period (AM/PM)
      periodColor: 'rgba(255,255,255,0.65)',
      periodShadow: '0 1px 4px rgba(0,0,0,0.45)',
      // Greeting
      greetShadow: '0 1px 4px rgba(0,0,0,0.60), 0 2px 14px rgba(0,0,0,0.28)',
      greetPrefix: 'rgba(255,255,255,0.68)',
      greetName: 'rgba(255,255,255,0.97)',
      // World clock
      timeColor: 'rgba(255,255,255,0.92)',
      cityColor: 'rgba(255,255,255,0.45)',
      periodRightColor: 'rgba(255,255,255,0.58)',
      timeShadow: '0 2px 18px rgba(0,0,0,0.55)',
      cityShadow: '0 1px 8px rgba(0,0,0,0.6)',
    };
  }
  return {
    clockColor: 'rgba(0,0,0,0.88)',
    colonColor: 'rgba(0,0,0,0.56)',
    clockShadow: 'none',
    periodColor: 'rgba(0,0,0,0.55)',
    periodShadow: 'none',
    greetShadow: 'none',
    greetPrefix: 'rgba(0,0,0,0.60)',
    greetName: 'rgba(0,0,0,0.92)',
    timeColor: 'rgba(0,0,0,0.82)',
    cityColor: 'rgba(0,0,0,0.45)',
    periodRightColor: 'rgba(0,0,0,0.48)',
    timeShadow: 'none',
    cityShadow: 'none',
  };
}

// ─── Search bar inline style tokens ───────────────────────────────────────────
//
// The search bar switches between dark/light palettes based on image luminance
// (centerOnDark). These are JS objects used as inline styles — not CSS vars —
// because the choice is made at runtime, not at theme-load time.
//
// Dark: floating on a dark photo — white text, dark glass dropdown.
// Light: floating on a light photo — dark text, translucent white dropdown.

const DARK_TOKENS = {
  pillBg: 'rgba(0,0,0,0.38)',
  pillBgFocused: 'rgba(0,0,0,0.50)',
  pillBorder: 'rgba(255,255,255,0.18)',
  pillBorderFoc: 'rgba(255,255,255,0.35)',
  shadowFocused: '0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
  shadow: '0 2px 20px rgba(0,0,0,0.40)',
  textColor: 'rgba(255,255,255,0.96)',
  placeholder: 'rgba(255,255,255,0.92)',
  placeholderShadow: 'none',
  divider: FM_DIVIDER,
  dropBg: FM_CARD_BG,
  dropBorder: FM_CARD_BORDER,
  dropShadow: FM_CARD_SHADOW,
  hoverBg: FM_SURFACE,
  activeBg: FM_SURFACE_2,
  selectedBg: 'rgba(255,255,255,0.10)',
  btnHoverBg: 'rgba(255,255,255,0.18)',
  btnBg: FM_SURFACE,
  suggText: FM_INK_2,
  selectedText: FM_INK_1,
  label: FM_INK_4,
  caret: 'rgba(255,255,255,0.7)',
  iconStroke: FM_ICON_STROKE,
  chevron: 'white',
};

const LIGHT_TOKENS = {
  pillBg: 'rgba(0,0,0,0.16)',
  pillBgFocused: 'rgba(0,0,0,0.22)',
  pillBorder: 'rgba(0,0,0,0.22)',
  pillBorderFoc: 'rgba(0,0,0,0.34)',
  shadowFocused: '0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
  shadow: '0 2px 14px rgba(0,0,0,0.16)',
  textColor: 'rgba(0,0,0,0.92)',
  placeholder: 'rgba(0,0,0,0.85)',
  placeholderShadow: 'none',
  divider: 'rgba(0,0,0,0.08)',
  dropBg: 'rgba(255,255,255,0.94)',
  dropBorder: 'rgba(0,0,0,0.08)',
  dropShadow: '0 8px 24px rgba(0,0,0,0.14)',
  hoverBg: 'rgba(0,0,0,0.05)',
  activeBg: 'rgba(0,0,0,0.08)',
  selectedBg: 'rgba(0,0,0,0.06)',
  btnHoverBg: 'rgba(0,0,0,0.13)',
  btnBg: 'rgba(0,0,0,0.07)',
  suggText: 'rgba(0,0,0,0.78)',
  selectedText: 'rgba(0,0,0,0.88)',
  label: 'rgba(0,0,0,0.30)',
  caret: 'rgba(0,0,0,0.6)',
  iconStroke: 'rgba(0,0,0,0.60)',
  chevron: 'black',
};

export function getTokens(dark) {
  return dark ? DARK_TOKENS : LIGHT_TOKENS;
}
