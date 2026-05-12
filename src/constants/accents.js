/**
 * Single source of truth for all accent color definitions.
 *
 * Each accent has two tone pairs:
 *   hex / fg       — light-mode: dark saturated hue on white surface (≥4.5:1 WCAG AA)
 *   darkHex / darkFg — dark-mode: luminous tonal variant on near-black surface (≥4.5:1 AA)
 *
 * Dark-mode accents are ~60–70 % lightness (HSL) so they glow against #1c1c1c flat
 * and rgba(255,255,255,0.10) glass surfaces without going neon.
 * All darkFg values are #111111 (dark text on bright accent background).
 *
 * Imported by both theme.js (full React runtime) and themeInit.js (pre-paint flash prevention).
 */
export const ACCENT_COLORS = [
  // name            light hex   light fg    dark hex    dark fg
  { name: 'Matte Black', hex: '#111111', fg: '#f3f3f3', darkHex: '#d4d4d4', darkFg: '#111111' }, // light 17.9:1 AAA | dark 11.3:1 AAA
  { name: 'Blueberry',   hex: '#1868CF', fg: '#f3f3f3', darkHex: '#5AAEFF', darkFg: '#111111' }, // light  5.4:1 AA  | dark  7.1:1 AAA
  { name: 'Strawberry',  hex: '#C6262E', fg: '#f3f3f3', darkHex: '#FF6B78', darkFg: '#111111' }, // light  5.3:1 AA  | dark  6.0:1 AA
  { name: 'Bubblegum',   hex: '#BF2E6E', fg: '#f3f3f3', darkHex: '#FF79B6', darkFg: '#111111' }, // light  4.9:1 AA  | dark  6.5:1 AA
  { name: 'Grape',       hex: '#7E32B8', fg: '#f3f3f3', darkHex: '#C08BFF', darkFg: '#111111' }, // light  6.5:1 AA  | dark  6.5:1 AA
  { name: 'Orange',      hex: '#B54E00', fg: '#f3f3f3', darkHex: '#FF9147', darkFg: '#111111' }, // light  5.2:1 AA  | dark  7.4:1 AAA
  { name: 'Banana',      hex: '#8B6500', fg: '#f3f3f3', darkHex: '#FFC83A', darkFg: '#111111' }, // light  4.8:1 AA  | dark 10.8:1 AAA
  { name: 'Lime',        hex: '#3E7A0A', fg: '#f3f3f3', darkHex: '#7EDE38', darkFg: '#111111' }, // light  4.7:1 AA  | dark  9.8:1 AAA
  { name: 'Mint',        hex: '#157A6A', fg: '#f3f3f3', darkHex: '#3DCFB8', darkFg: '#111111' }, // light  4.7:1 AA  | dark  8.6:1 AAA
  { name: 'Latte',       hex: '#8B6228', fg: '#f3f3f3', darkHex: '#DCAB4E', darkFg: '#111111' }, // light  4.9:1 AA  | dark  7.8:1 AAA
  { name: 'Cocoa',       hex: '#715344', fg: '#f3f3f3', darkHex: '#D4907F', darkFg: '#111111' }, // light  6.5:1 AA  | dark  6.3:1 AA
];
