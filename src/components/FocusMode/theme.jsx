// ─── Focus Mode Token System ──────────────────────────────────────────────────
//
// Focus Mode ALWAYS renders over a dark photo / orb backdrop.
// All surface tokens originate from THEME_PROFILES[cardStyle].focus
// (src/theme/profiles.js) — the single source of truth. Paper / glass / comic
// each have a complete, self-contained Focus Mode profile.
//
// Two application points:
//   • getFMCardVars(cardStyle) — spread onto the .fm-root div, sets every
//     `--fm-*` CSS var so all in-root panels resolve them.
//   • getDialogStyle(accent, cardStyle) — spread onto portaled dialogs
//     (rendered outside .fm-root), so their inner elements resolve the same
//     `--fm-*` vars plus dark-tone accent.
//
// The FM_* constants below are CSS-var references (var(--fm-*)), NOT raw
// values — components that consume them automatically follow the active theme.
//
// Photo-luminance-adaptive tokens (getPhotoTokens / getTokens) are a separate
// axis: they handle "text floating directly on the photo" (dark vs light photo),
// which is independent of the card-surface theme.
import { getFMAccentVars } from "../../constants/accents";
import { THEME_PROFILES } from "../../theme/profiles";
import { APP_SETTINGS_DEFAULTS } from "../../constants/defaults";

// ── Card surface token exports — CSS var wrappers ──────────────────────────────
export const FM_CARD_BG = "var(--fm-card-bg)";
export const FM_CARD_BORDER = "var(--fm-card-border)";
export const FM_CARD_BLUR = "var(--fm-card-blur)";
export const FM_CARD_SHADOW = "var(--fm-card-shadow)";
export const FM_CARD_RADIUS = "var(--fm-card-radius, 14px)";
export const FM_CARD_BORDER_WIDTH = "var(--fm-card-border-width, 1px)";

// ── Sub-surfaces (interactive elements inside cards) ───────────────────────────
export const FM_SURFACE = "var(--fm-surface)";
export const FM_SURFACE_2 = "var(--fm-surface-2)";
export const FM_BORDER = "var(--fm-border)";
export const FM_DIVIDER = "var(--fm-divider)";
export const FM_SECTION_CARD_BG = "var(--fm-section-bg)";
export const FM_SECTION_CARD_BORDER = "var(--fm-section-border)";

// ── Ink scale (text on cards — always white-on-dark) ───────────────────────────
export const FM_INK_1 = "var(--fm-ink-1)";
export const FM_INK_2 = "var(--fm-ink-2)";
export const FM_INK_3 = "var(--fm-ink-3)";
export const FM_INK_4 = "var(--fm-ink-4)";

// ── Interactive element tokens ─────────────────────────────────────────────────
export const FM_TOGGLE_THUMB = "var(--fm-toggle-thumb)";
export const FM_TOGGLE_SHADOW = "var(--fm-toggle-shadow)";
export const FM_TOGGLE_OFF_BG = "var(--fm-toggle-off-bg)";

export const FM_CLOSE_BG = "var(--fm-close-bg)";
export const FM_CLOSE_BG_HOVER = "var(--fm-close-bg-hover)";
export const FM_CLOSE_BORDER = "var(--fm-close-border)";
export const FM_CLOSE_COLOR = "var(--fm-close-color)";

export const FM_SPINNER_RING = "var(--fm-spinner-ring)";
export const FM_SPINNER_ACTIVE = "var(--fm-spinner-active)";

export const FM_ICON_STROKE = "var(--fm-icon-stroke)";
export const FM_ICON_STROKE_MUTED = "var(--fm-icon-stroke-muted)";

// ── Semantic status colors ─────────────────────────────────────────────────────
export const FM_SUCCESS = "var(--fm-success)";
export const FM_SUCCESS_BG = "var(--fm-success-bg)";
export const FM_SUCCESS_BORDER = "var(--fm-success-border)";
export const FM_SUCCESS_DOT = "var(--fm-success-dot)";
export const FM_SYNC_BG = "var(--fm-sync-bg)";
export const FM_SYNC_BORDER = "var(--fm-sync-border)";

export const FM_DANGER = "var(--fm-danger)";
export const FM_DANGER_BG = "var(--fm-danger-bg)";
export const FM_DANGER_BORDER = "var(--fm-danger-border)";
export const FM_DANGER_HOVER_BG = "var(--fm-danger-hover-bg)";

// ── Popover / caret-dropdown panel ─────────────────────────────────────────────
export const FM_POPOVER_BG = "var(--fm-popover-bg)";
export const FM_POPOVER_BORDER = "var(--fm-popover-border)";
export const FM_POPOVER_SHADOW = "var(--fm-popover-shadow)";

// ── Orb scene / stock direction ────────────────────────────────────────────────
export const FM_ORB_BG = "var(--fm-orb-bg)";
export const FM_STOCK_UP = "var(--fm-stock-up)";
export const FM_STOCK_UP_BG = "var(--fm-stock-up-bg)";
export const FM_STOCK_DOWN = "var(--fm-stock-down)";
export const FM_STOCK_DOWN_BG = "var(--fm-stock-down-bg)";

// ─── getFMCardVars ─────────────────────────────────────────────────────────────
// Returns the complete Focus Mode profile for a card style, to spread onto the
// .fm-root div. Setting every `--fm-*` var here means all in-root panels
// (left cards, toolbar, tasks pill, search bar) resolve correctly via the
// FM_* var wrappers above.
export function getFMCardVars(cardStyle) {
  const profile = THEME_PROFILES[cardStyle] ?? THEME_PROFILES.glass;
  return { ...profile.focus };
}

// ─── FOCUS_THEME ────────────────────────────────────────────────────────────────
// Legacy-compat object — panels use `const t = FOCUS_THEME`.
export const FOCUS_THEME = {
  card: {
    background: FM_CARD_BG,
    backgroundImage: "var(--fm-card-texture, none)",
    backgroundRepeat: "repeat",
    backgroundSize: "200px 200px",
    backdropFilter: FM_CARD_BLUR,
    WebkitBackdropFilter: FM_CARD_BLUR,
    border: `${FM_CARD_BORDER_WIDTH} solid ${FM_CARD_BORDER}`,
    borderRadius: FM_CARD_RADIUS,
    boxShadow: FM_CARD_SHADOW,
  },
  label: FM_INK_3,
  text: FM_INK_1,
  sub: FM_INK_2,
  track: FM_SURFACE,
  btnBg: FM_SURFACE,
  btnBorder: FM_BORDER,
  btnColor: FM_INK_1,
  btnIcon: FM_INK_3,
};

// ─── AnimatedCard ────────────────────────────────────────────────────────────────
export const AnimatedCard = ({ delay, children }) => <>{children}</>;

// ─── Dialog surface + CSS var pins ──────────────────────────────────────────────
// Portaled dialogs render outside .fm-root, so they must carry the full
// `--fm-*` profile + dark ink pins + dark-tone accent with them.

/** Full surface + CSS-var style object for a portaled FM dialog. */
function dialogSurface(focus) {
  return {
    ...focus, // sets every --fm-* var on the dialog element
    background: "var(--fm-card-bg)",
    backgroundImage: "var(--fm-card-texture, none)",
    backgroundRepeat: "repeat",
    backgroundSize: "200px 200px",
    backdropFilter: "var(--fm-card-blur)",
    WebkitBackdropFilter: "var(--fm-card-blur)",
    border: "var(--fm-card-border-width, 1px) solid var(--fm-card-border)",
    borderRadius: "var(--fm-card-radius, 14px)",
    boxShadow: "var(--fm-card-shadow)",
    // Pin --w-* canvas vars to FM dark values so any var(--w-*) inside the
    // portal resolves correctly regardless of canvas mode.
    "--w-ink-1": focus["--fm-ink-1"],
    "--w-ink-2": focus["--fm-ink-2"],
    "--w-ink-3": focus["--fm-ink-3"],
    "--w-ink-4": focus["--fm-ink-4"],
    "--w-ink-5": focus["--fm-ink-4"],
    "--w-border": focus["--fm-border"],
    "--w-surface": focus["--fm-surface"],
    "--w-surface-2": focus["--fm-surface-2"],
  };
}

/** Legacy glass dialog style (glass profile). */
export const DIALOG_STYLE = dialogSurface(THEME_PROFILES.glass.focus);

/** Legacy comic dialog style (comic profile). */
export const COMIC_DIALOG_STYLE = dialogSurface(THEME_PROFILES.comic.focus);

/**
 * Use this instead of spreading DIALOG_STYLE directly on portalled FM dialogs.
 * Returns the full focus profile surface + dark ink pins + dark-tone accent.
 *
 * @param {string} accentName  — accent key (e.g. "blueberry")
 * @param {string} cardStyle   — "glass" | "paper" | "comic" (defaults to "glass")
 */
export function getDialogStyle(accentName, cardStyle = APP_SETTINGS_DEFAULTS.cardStyle) {
  const profile = THEME_PROFILES[cardStyle] ?? THEME_PROFILES.glass;
  return {
    ...dialogSurface(profile.focus),
    ...getFMAccentVars(accentName),
  };
}

// Section divider & card (sub-panel inside a dialog)
export const SECTION_BORDER = `1px solid ${FM_DIVIDER}`;
export const SECTION_CARD_STYLE = {
  borderRadius: 12,
  background: FM_SECTION_CARD_BG,
  border: `1px solid ${FM_SECTION_CARD_BORDER}`,
};

// ─── Photo-luminance adaptive tokens ────────────────────────────────────────────
//
// Used ONLY for elements floating directly on the photo/orb (not inside a card):
// clock digits, greeting text, and world clock labels. Theme-independent.
export function getPhotoTokens(centerOnDark) {
  if (centerOnDark) {
    return {
      clockColor: "rgba(255,255,255,0.97)",
      colonColor: "rgba(255,255,255,0.75)",
      clockShadow: "0 1px 3px rgba(0,0,0,0.50), 0 2px 18px rgba(0,0,0,0.28)",
      periodColor: "rgba(255,255,255,0.65)",
      periodShadow: "0 1px 4px rgba(0,0,0,0.45)",
      greetShadow: "0 1px 4px rgba(0,0,0,0.60), 0 2px 14px rgba(0,0,0,0.28)",
      greetPrefix: "rgba(255,255,255,0.68)",
      greetName: "rgba(255,255,255,0.97)",
      timeColor: "rgba(255,255,255,0.92)",
      cityColor: "rgba(255,255,255,0.45)",
      periodRightColor: "rgba(255,255,255,0.58)",
      timeShadow: "0 2px 18px rgba(0,0,0,0.55)",
      cityShadow: "0 1px 8px rgba(0,0,0,0.6)",
    };
  }
  return {
    clockColor: "rgba(0,0,0,0.88)",
    colonColor: "rgba(0,0,0,0.56)",
    clockShadow: "none",
    periodColor: "rgba(0,0,0,0.55)",
    periodShadow: "none",
    greetShadow: "none",
    greetPrefix: "rgba(0,0,0,0.60)",
    greetName: "rgba(0,0,0,0.92)",
    timeColor: "rgba(0,0,0,0.82)",
    cityColor: "rgba(0,0,0,0.45)",
    periodRightColor: "rgba(0,0,0,0.48)",
    timeShadow: "none",
    cityShadow: "none",
  };
}

// ─── Search bar inline style tokens (photo-luminance adaptive) ─────────────────
const DARK_TOKENS = {
  pillBg: "rgba(0,0,0,0.38)",
  pillBgFocused: "rgba(0,0,0,0.50)",
  pillBorder: "rgba(255,255,255,0.18)",
  pillBorderFoc: "rgba(255,255,255,0.35)",
  shadowFocused:
    "0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)",
  shadow: "0 2px 20px rgba(0,0,0,0.40)",
  textColor: "rgba(255,255,255,0.96)",
  placeholder: "rgba(255,255,255,0.92)",
  placeholderShadow: "none",
  divider: FM_DIVIDER,
  dropBg: FM_CARD_BG,
  dropBorder: FM_CARD_BORDER,
  dropShadow: FM_CARD_SHADOW,
  hoverBg: FM_SURFACE,
  activeBg: FM_SURFACE_2,
  selectedBg: "rgba(255,255,255,0.10)",
  btnHoverBg: "rgba(255,255,255,0.18)",
  btnBg: FM_SURFACE,
  suggText: FM_INK_2,
  selectedText: FM_INK_1,
  label: FM_INK_4,
  caret: "rgba(255,255,255,0.7)",
  iconStroke: FM_ICON_STROKE,
  chevron: "white",
};

const LIGHT_TOKENS = {
  pillBg: "rgba(0,0,0,0.16)",
  pillBgFocused: "rgba(0,0,0,0.22)",
  pillBorder: "rgba(0,0,0,0.22)",
  pillBorderFoc: "rgba(0,0,0,0.34)",
  shadowFocused:
    "0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.9)",
  shadow: "0 2px 14px rgba(0,0,0,0.16)",
  textColor: "rgba(0,0,0,0.92)",
  placeholder: "rgba(0,0,0,0.85)",
  placeholderShadow: "none",
  divider: "rgba(0,0,0,0.08)",
  dropBg: "rgba(255,255,255,0.94)",
  dropBorder: "rgba(0,0,0,0.08)",
  dropShadow: "0 8px 24px rgba(0,0,0,0.14)",
  hoverBg: "rgba(0,0,0,0.05)",
  activeBg: "rgba(0,0,0,0.08)",
  selectedBg: "rgba(0,0,0,0.06)",
  btnHoverBg: "rgba(0,0,0,0.13)",
  btnBg: "rgba(0,0,0,0.07)",
  suggText: "rgba(0,0,0,0.78)",
  selectedText: "rgba(0,0,0,0.88)",
  label: "rgba(0,0,0,0.30)",
  caret: "rgba(0,0,0,0.6)",
  iconStroke: "rgba(0,0,0,0.60)",
  chevron: "black",
};

export function getTokens(dark) {
  return dark ? DARK_TOKENS : LIGHT_TOKENS;
}
