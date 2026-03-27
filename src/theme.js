

export const ACCENT_COLORS = [
  { name: 'Default', hex: '#111827', fg: '#ffffff' },
  { name: 'Blueberry', hex: '#3689E6', fg: '#ffffff' },
  { name: 'Strawberry', hex: '#C6262E', fg: '#ffffff' },
  { name: 'Bubblegum', hex: '#DE3E80', fg: '#ffffff' },
  { name: 'Grape', hex: '#A56DE2', fg: '#ffffff' },
  { name: 'Orange', hex: '#F37329', fg: '#ffffff' },
  { name: 'Banana', hex: '#F9C440', fg: '#111827' },
  { name: 'Lime', hex: '#68B723', fg: '#ffffff' },
  { name: 'Mint', hex: '#28BCA3', fg: '#ffffff' },
  { name: 'Latte', hex: '#CFA25E', fg: '#111827' },
  { name: 'Cocoa', hex: '#715344', fg: '#ffffff' },
];

const LIGHT_TOKENS = {
  '--w-ink-1': '#111827',
  '--w-ink-2': '#1f2937',
  '--w-ink-3': '#374151',
  '--w-ink-4': '#4b5563',
  '--w-ink-5': '#9ca3af',
  '--w-ink-6': '#d1d5db',
  '--w-surface': '#ffffff',
  '--w-surface-2': '#f9fafb',
  '--w-border': '#e5e7eb',
  '--w-page-bg': '#F0F0F2',
};

const DARK_TOKENS = {
  '--w-ink-1': '#f2f2f2',   /* near-white — headlines                  */
  '--w-ink-2': '#e0e0e0',   /* primary labels & display numbers        */
  '--w-ink-3': '#c4c4c4',   /* bold value text, strong secondary       */
  '--w-ink-4': '#8e8e8e',   /* medium context, captions      5.0:1 ✓   */
  '--w-ink-5': '#636363',   /* muted labels                  3.2:1 ✓   */
  '--w-ink-6': '#484848',   /* inactive / decorative         2.2:1      */
  '--w-surface': '#1c1c1c', /* mid-point widget card surface            */
  '--w-surface-2': '#252525', /* raised surface — inputs, sub-panels   */
  '--w-border': '#333333',  /* hairline separators                      */
  '--w-page-bg': '#141414', /* page canvas behind widget grid           */
};

const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
};

export const applyTheme = (accent, mode) => {
  const root = document.documentElement;
  const tokens = mode === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
  Object.entries(tokens).forEach(([k, v]) => root.style.setProperty(k, v));
  const color = ACCENT_COLORS.find(a => a.name === accent) || ACCENT_COLORS[0];
  root.style.setProperty('--w-accent', color.hex);
  root.style.setProperty('--w-accent-fg', color.fg);
  root.style.setProperty('--w-accent-rgb', hexToRgb(color.hex));
  root.setAttribute('data-mode', mode);
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
      };
    }
  } catch { /* ignore */ }
  return {
    accent: localStorage.getItem('app_accent') || 'Default',
    mode: localStorage.getItem('app_mode') || 'light',
  };
};

const { accent: _initAccent, mode: _initMode } = _getInitTheme();
applyTheme(_initAccent, _initMode);
