/**
 * Theme initialisation — runs as the very first module import in index.jsx.
 * Sets data-mode and CSS variables on <html> from localStorage before React
 * renders, preventing a light-flash on dark-mode page loads.
 *
 * 'auto' mode is resolved synchronously here using cached coordinates
 * (or Kathmandu fallback) so there is no flash when the page loads at night.
 */

import { computeAutoMode } from './utilities/sunTime';
import { ACCENT_COLORS } from './constants/accents';
import { THEME_PROFILES } from './theme/profiles';
import { APP_SETTINGS_DEFAULTS } from './constants/defaults';
import { loadCardStyle } from './styles/cardStyleLoader';

try {
  // Prefer the Zustand persist key — this is where settings live after first run.
  // Fall back to legacy per-key entries for first-time users migrating from older builds.
  let mode = APP_SETTINGS_DEFAULTS.mode;
  let accentName = APP_SETTINGS_DEFAULTS.accent;
  let cardStyle = APP_SETTINGS_DEFAULTS.cardStyle;

  const stored = JSON.parse(localStorage.getItem('undistracted_settings') || 'null');
  if (stored?.state) {
    mode = stored.state.mode || APP_SETTINGS_DEFAULTS.mode;
    accentName = stored.state.accent || APP_SETTINGS_DEFAULTS.accent;
    cardStyle = stored.state.cardStyle || APP_SETTINGS_DEFAULTS.cardStyle;
  } else {
    const storedMode = localStorage.getItem('app_mode');
    mode = storedMode || APP_SETTINGS_DEFAULTS.mode;
    accentName = localStorage.getItem('app_accent') || APP_SETTINGS_DEFAULTS.accent;
  }

  // Resolve 'auto' synchronously before painting — uses cached coords or Kathmandu
  if (mode === 'auto') mode = computeAutoMode();

  const accent = ACCENT_COLORS.find(a => a.name === accentName) || ACCENT_COLORS[0];
  const dark = mode === 'dark';
  const r = document.documentElement;

  // Apply the complete per-theme profile so there is no flash regardless of
  // the active card style (paper / glass / comic).
  const profile = THEME_PROFILES[cardStyle] ?? THEME_PROFILES[APP_SETTINGS_DEFAULTS.cardStyle];
  const tokens = profile[dark ? 'dark' : 'light'] ?? profile.light;
  Object.entries(tokens).forEach(([k, v]) => r.style.setProperty(k, v));

  r.setAttribute('data-mode', mode);
  r.setAttribute('data-card-style', cardStyle);
  // Load the card-style stylesheet for non-default styles (comic / glass).
  // `paper` lives in main.scss so the default look has no flash.
  loadCardStyle(cardStyle);

  // Use the luminous dark-mode tonal variant when dark, otherwise the standard light-mode hex
  const accentHex = dark ? (accent.darkHex ?? accent.hex) : accent.hex;
  const accentFg  = dark ? (accent.darkFg  ?? accent.fg)  : accent.fg;

  // Same hex→rgb derivation as theme.js applyTheme — OrbBackground / comic
  // textures read it as rgba(var(--w-accent-rgb), …).
  const hexToRgb = (hex) => {
    const r = Number.parseInt(hex.slice(1, 3), 16);
    const g = Number.parseInt(hex.slice(3, 5), 16);
    const b = Number.parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  };

  r.style.setProperty('--w-accent',    accentHex);
  r.style.setProperty('--w-accent-fg', accentFg);
  r.style.setProperty('--w-accent-rgb', hexToRgb(accentHex));
  r.style.backgroundColor = tokens['--w-page-bg'] ?? '#141414';
} catch (_) { /* localStorage unavailable */ }
