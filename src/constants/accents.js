/**
 * Single source of truth for all accent color definitions.
 * Each accent has:
 *   hex — the accent background color
 *   fg  — foreground text color (#f3f3f3, all accents meet WCAG AA ≥4.5:1)
 *
 * Imported by both theme.js (full React runtime) and themeInit.js (pre-paint flash prevention).
 */
export const ACCENT_COLORS = [
  { name: 'Matte Black', hex: '#111111', fg: '#f3f3f3' },  // 17.9:1 ✓ AAA
  { name: 'Blueberry', hex: '#1565C0', fg: '#f3f3f3' },  //  5.1:1 ✓ AA
  { name: 'Strawberry', hex: '#C6262E', fg: '#f3f3f3' },  //  5.3:1 ✓ AA
  { name: 'Bubblegum', hex: '#BF2E6E', fg: '#f3f3f3' },  //  4.9:1 ✓ AA
  { name: 'Grape', hex: '#7B3AAE', fg: '#f3f3f3' },  //  6.1:1 ✓ AA
  { name: 'Orange', hex: '#B54E00', fg: '#f3f3f3' },  //  4.6:1 ✓ AA
  { name: 'Banana', hex: '#8B6500', fg: '#f3f3f3' },  //  4.8:1 ✓ AA
  { name: 'Lime', hex: '#3E7A0A', fg: '#f3f3f3' },  //  4.7:1 ✓ AA
  { name: 'Mint', hex: '#157A6A', fg: '#f3f3f3' },  //  4.7:1 ✓ AA
  { name: 'Latte', hex: '#8B6228', fg: '#f3f3f3' },  //  4.9:1 ✓ AA
  { name: 'Cocoa', hex: '#715344', fg: '#f3f3f3' },  //  6.5:1 ✓ AA
];
