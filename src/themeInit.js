/**
 * Theme initialisation — runs as the very first module import in index.jsx.
 * Sets data-mode and CSS variables on <html> from localStorage before React
 * renders, preventing a light-flash on dark-mode page loads.
 */

const ACCENTS = {
  Default: { hex: '#111827', fg: '#ffffff' },
  Blueberry: { hex: '#3689E6', fg: '#ffffff' },
  Strawberry: { hex: '#C6262E', fg: '#ffffff' },
  Bubblegum: { hex: '#DE3E80', fg: '#ffffff' },
  Grape: { hex: '#A56DE2', fg: '#ffffff' },
  Orange: { hex: '#F37329', fg: '#ffffff' },
  Banana: { hex: '#F9C440', fg: '#111827' },
  Lime: { hex: '#68B723', fg: '#ffffff' },
  Mint: { hex: '#28BCA3', fg: '#ffffff' },
  Latte: { hex: '#CFA25E', fg: '#111827' },
  Cocoa: { hex: '#715344', fg: '#ffffff' },
};

const LIGHT_BG = '#F0F0F2';
const DARK_BG = '#141920';
const LIGHT_SURFACE = '#ffffff';
const DARK_SURFACE = '#1e2433';
const LIGHT_BORDER = '#e5e7eb';
const DARK_BORDER = '#374151';

try {
  // Prefer the Zustand persist key — this is where settings live after first run.
  // Fall back to legacy per-key entries for first-time users migrating from older builds.
  let mode = 'light';
  let accentName = 'Default';

  const stored = JSON.parse(localStorage.getItem('undistracted_settings') || 'null');
  if (stored?.state) {
    mode = stored.state.mode || 'light';
    accentName = stored.state.accent || 'Default';
  } else {
    mode = localStorage.getItem('app_mode') || 'light';
    accentName = localStorage.getItem('app_accent') || 'Default';
  }

  const accent = ACCENTS[accentName] || ACCENTS.Default;
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
