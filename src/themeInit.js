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

const LIGHT_BG = '#ebebeb';
const DARK_BG = '#141414';
const LIGHT_SURFACE = '#f5f5f5';
const DARK_SURFACE = '#1c1c1c';
const LIGHT_BORDER = '#e0e0e0';
const DARK_BORDER = '#333333';

try {
  // Prefer the Zustand persist key — this is where settings live after first run.
  // Fall back to legacy per-key entries for first-time users migrating from older builds.
  let mode = 'light';
  let accentName = 'Matte Black';

  const stored = JSON.parse(localStorage.getItem('undistracted_settings') || 'null');
  if (stored?.state) {
    mode = stored.state.mode || 'light';
    accentName = stored.state.accent || 'Matte Black';
  } else {
    const storedMode = localStorage.getItem('app_mode');
    // On first install (nothing stored), respect the browser/OS color-scheme preference.
    const prefersDark = !storedMode && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    mode = storedMode || (prefersDark ? 'dark' : 'light');
    accentName = localStorage.getItem('app_accent') || 'Matte Black';
  }

  // Resolve 'auto' synchronously before painting — uses cached coords or Kathmandu
  if (mode === 'auto') mode = computeAutoMode();

  const accent = ACCENT_COLORS.find(a => a.name === accentName) || ACCENT_COLORS[0];
  const dark = mode === 'dark';
  const r = document.documentElement;

  r.setAttribute('data-mode', mode);
  r.style.setProperty('--w-page-bg', dark ? DARK_BG : LIGHT_BG);
  r.style.setProperty('--w-surface', dark ? DARK_SURFACE : LIGHT_SURFACE);
  r.style.setProperty('--w-border', dark ? DARK_BORDER : LIGHT_BORDER);
  r.style.setProperty('--w-accent', accent.hex);
  r.style.setProperty('--w-accent-fg', accent.fg);
  r.style.backgroundColor = dark ? DARK_BG : LIGHT_BG;
} catch (_) { /* localStorage unavailable */ }
