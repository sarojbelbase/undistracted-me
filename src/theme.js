import { computeAutoMode } from "./utilities/sunTime";
import { THEME_PROFILES } from "./theme/profiles";
export { ACCENT_COLORS } from "./constants/accents";
export { CARD_STYLES } from "./theme/profiles";
import { ACCENT_COLORS } from "./constants/accents";

const hexToRgb = (hex) => {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

/**
 * Apply theme + card-style CSS custom properties to :root.
 *
 * Reads the complete per-theme profile from THEME_PROFILES (src/theme/profiles.js)
 * — the single source of truth for every styling dimension. Each profile's
 * light/dark map already includes the base ink/surface scale, semantic colors,
 * and card/panel/modal surface tokens, so applying it wholesale swaps the whole
 * look at once.
 *
 * @param {string} accent    - accent color name from ACCENT_COLORS
 * @param {string} mode      - 'light' | 'dark' | 'auto'
 * @param {string} cardStyle - 'paper' | 'glass' | 'comic'
 */
export const applyTheme = (accent, mode, cardStyle = "glass") => {
  const resolved = mode === "auto" ? computeAutoMode() : mode;
  const root = document.documentElement;

  // Complete theme profile (base ink/surface + semantic + card/panel/modal).
  const profile = THEME_PROFILES[cardStyle] ?? THEME_PROFILES.glass;
  const tokens = profile[resolved] ?? profile.light;
  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v));

  // Accent colour — pick the luminous dark-mode tonal variant when in dark mode.
  // Null-safe: if the accent list is empty / the name doesn't resolve, fall back
  // to neutral monochrome tones (matching the "Matte Black" pair) so this never throws.
  const color =
    ACCENT_COLORS.find((a) => a.name === accent) || ACCENT_COLORS[0];
  const isDark = resolved === "dark";
  const accentHex = isDark
    ? (color?.darkHex ?? color?.hex ?? "#d4d4d4")
    : (color?.hex ?? "#111111");
  const accentFg = isDark
    ? (color?.darkFg ?? color?.fg ?? "#000000")
    : (color?.fg ?? "#ffffff");
  root.style.setProperty("--w-accent", accentHex);
  root.style.setProperty("--w-accent-fg", accentFg);
  root.style.setProperty("--w-accent-rgb", hexToRgb(accentHex));
  root.dataset.mode = resolved;

  // data-card-style attribute — enables [data-card-style="…"] CSS selectors
  // in _paper.scss / _glass.scss / _comic.scss for non-token styling
  // (typography weight/letter-spacing, border-radius, scrollbars, etc.).
  root.dataset.cardStyle = cardStyle ?? "glass";
};

/**
 * Apply theme immediately on module load to prevent flash of unstyled content.
 * Reads from the Zustand persist key first, falling back to legacy per-key
 * entries so existing users are not affected after the Zustand migration.
 */
const _getInitTheme = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("undistracted_settings"));
    if (stored?.state) {
      return {
        accent: stored.state.accent || "Matte Black",
        mode: stored.state.mode || "light",
        cardStyle: stored.state.cardStyle || "glass",
      };
    }
  } catch {
    /* ignore */
  }
  return {
    accent: localStorage.getItem("app_accent") || "Matte Black",
    mode: localStorage.getItem("app_mode") || "light",
    cardStyle: "glass",
  };
};

const {
  accent: _initAccent,
  mode: _initMode,
  cardStyle: _initCardStyle,
} = _getInitTheme();
applyTheme(_initAccent, _initMode, _initCardStyle);
