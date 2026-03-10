import { useState, useEffect } from 'react';

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
  '--w-ink-1': '#f9fafb',
  '--w-ink-2': '#f3f4f6',
  '--w-ink-3': '#e5e7eb',
  '--w-ink-4': '#9ca3af',
  '--w-ink-5': '#6b7280',
  '--w-ink-6': '#374151',
  '--w-surface': '#1e2433',
  '--w-surface-2': '#252d3d',
  '--w-border': '#374151',
  '--w-page-bg': '#141920',
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

// Apply immediately on import to prevent flash of unstyled content
applyTheme(
  localStorage.getItem('app_accent') || 'Default',
  localStorage.getItem('app_mode') || 'light',
);

export const useTheme = () => {
  const [accent, setAccentState] = useState(() => localStorage.getItem('app_accent') || 'Default');
  const [mode, setModeState] = useState(() => localStorage.getItem('app_mode') || 'light');

  useEffect(() => {
    applyTheme(accent, mode);
  }, [accent, mode]);

  const setAccent = (name) => {
    setAccentState(name);
    localStorage.setItem('app_accent', name);
  };

  const setMode = (m) => {
    if (m === 'dark' && accent === 'Default') {
      setAccent('Blueberry');
    }
    setModeState(m);
    localStorage.setItem('app_mode', m);
  };

  return { accent, mode, setAccent, setMode };
};
