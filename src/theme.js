

import { computeAutoMode } from './utilities/sunTime';
import { CARD_STYLE_TOKENS } from './constants/cardStyles';

export const ACCENT_COLORS = [
  { name: 'Default', hex: '#111111', fg: '#f5f5f5' },  // 18.4:1 ✓ AAA
  { name: 'Blueberry', hex: '#3689E6', fg: '#111111' },  // 4.9:1  ✓ AA
  { name: 'Strawberry', hex: '#C6262E', fg: '#f5f5f5' },  // 5.5:1  ✓ AA
  { name: 'Bubblegum', hex: '#DE3E80', fg: '#f5f5f5' },  // 4.0:1  ~ (mid-luminance, best available)
  { name: 'Grape', hex: '#A56DE2', fg: '#111111' },  // 4.9:1  ✓ AA
  { name: 'Orange', hex: '#F37329', fg: '#111111' },  // 6.0:1  ✓ AA
  { name: 'Banana', hex: '#F9C440', fg: '#111111' },  // 10.7:1 ✓ AAA
  { name: 'Lime', hex: '#68B723', fg: '#111111' },  // 6.9:1  ✓ AA
  { name: 'Mint', hex: '#28BCA3', fg: '#111111' },  // 7.2:1  ✓ AA
  { name: 'Latte', hex: '#CFA25E', fg: '#111111' },  // 7.4:1  ✓ AA
  { name: 'Cocoa', hex: '#715344', fg: '#f5f5f5' },  // 6.7:1  ✓ AA
];

const LIGHT_TOKENS = {
  '--w-ink-1': '#111111',  /* neutral near-black — no hue bias, 18.4:1 ✓ AAA */
  '--w-ink-2': '#222222',  /* 14.5:1 ✓ AAA */
  '--w-ink-3': '#3d3d3d',  /* 9.4:1  ✓ AAA */
  '--w-ink-4': '#4d4d4d',  /* 7.7:1  ✓ AA  */
  '--w-ink-5': '#707070',  /* 4.6:1  ✓ AA  */
  '--w-ink-6': '#a0a0a0',  /* 2.5:1  — decorative/inactive */
  '--w-surface': '#f5f5f5',  /* neutral off-white — 18.4:1 vs #111111 ✓ AAA */
  '--w-surface-2': '#f0f0f0',
  '--w-surface-3': '#e8e8e8',  /* tertiary surface — icon skeletons    */
  '--w-border': '#e0e0e0',
  '--w-page-bg': '#ebebeb',
  '--w-danger': '#ef4444',     /* semantic error / destructive red      */
  '--w-success': '#22c55e',    /* semantic success / live green         */
};

const DARK_TOKENS = {
  '--w-ink-1': '#f2f2f2',   /* near-white — headlines                  */
  '--w-ink-2': '#e0e0e0',   /* primary labels & display numbers        */
  '--w-ink-3': '#c4c4c4',   /* bold value text, strong secondary       */
  '--w-ink-4': '#8e8e8e',   /* medium context, captions      5.0:1 ✓   */
  '--w-ink-5': '#909090',   /* muted labels             5.0:1 ✓ AA   */
  '--w-ink-6': '#6e6e6e',   /* inactive / decorative    3.3:1 ✓ min   */
  '--w-surface': '#1c1c1c', /* mid-point widget card surface            */
  '--w-surface-2': '#252525', /* raised surface — inputs, sub-panels   */
  '--w-surface-3': '#2a2a2a',  /* tertiary surface — icon skeletons    */
  '--w-border': '#333333',  /* hairline separators                      */
  '--w-page-bg': '#141414', /* page canvas behind widget grid           */
  '--w-danger': '#f87171',     /* semantic error / destructive red (lighter for dark bg) */
  '--w-success': '#4ade80',    /* semantic success / live green (lighter for dark bg)    */
};

const hexToRgb = (hex) => {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

/**
 * Apply theme and card-style CSS custom properties to :root.
 *
 * @param {string} accent    - accent color name from ACCENT_COLORS
 * @param {string} mode      - 'light' | 'dark' | 'auto'
 * @param {string} cardStyle - 'flat' | 'glass' | 'soft' | 'outlined'
 */
export const applyTheme = (accent, mode, cardStyle = 'glass') => {
  const resolved = mode === 'auto' ? computeAutoMode() : mode;
  const root = document.documentElement;

  // Base design tokens
  const tokens = resolved === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v));

  // Accent colour
  const color = ACCENT_COLORS.find(a => a.name === accent) || ACCENT_COLORS[0];
  root.style.setProperty('--w-accent', color.hex);
  root.style.setProperty('--w-accent-fg', color.fg);
  root.style.setProperty('--w-accent-rgb', hexToRgb(color.hex));
  root.dataset.mode = resolved;

  // Card / surface style tokens
  const cardTokens =
    (CARD_STYLE_TOKENS[cardStyle] ?? CARD_STYLE_TOKENS.glass)[resolved];
  Object.entries(cardTokens).forEach(([k, v]) => root.style.setProperty(k, v));
};

/**
 * Apply theme immediately on module load to prevent flash of unstyled content.
 * Reads from the Zustand persist key first, falling back to legacy per-key
 * entries so existing users are not affected after the Zustand migration.
 */
const _getInitTheme = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('undistracted_settings'));
    if (stored?.state) {
      return {
        accent: stored.state.accent || 'Default',
        mode: stored.state.mode || 'light',
        cardStyle: stored.state.cardStyle || 'glass',
      };
    }
  } catch { /* ignore */ }
  return {
    accent: localStorage.getItem('app_accent') || 'Default',
    mode: localStorage.getItem('app_mode') || 'light',
    cardStyle: 'glass',
  };
};

const { accent: _initAccent, mode: _initMode, cardStyle: _initCardStyle } = _getInitTheme();
applyTheme(_initAccent, _initMode, _initCardStyle);
