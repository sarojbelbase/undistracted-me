/**
 * Single source of truth for all accent color definitions.
 *
 * Each accent has two tone pairs:
 *   hex / fg       — light-mode: dark saturated hue on white surface (≥4.5:1 WCAG AA)
 *   darkHex / darkFg — dark-mode: luminous tonal variant on near-black surface (≥4.5:1 AA)
 *
 * fg is #ffffff (pure white) — maximizes contrast on all dark light-mode hex values.
 * darkFg is #000000 (pure black) — maximizes contrast on all luminous dark-mode hex values.
 * Both are strictly better than the prior #f3f3f3 / #111111 "near" versions:
 *   light fg #f3f3f3 → #ffffff: +0.4–0.7 ratio points on every accent
 *   dark fg  #111111 → #000000: +0.8–1.4 ratio points on every accent
 * Light text (#ffffff) on dark-mode accents and dark text (#000000) on light-mode accents
 * always fail (1.x–3.x:1) — no "cross direction" is possible here.
 *
 * Dark-mode accents are ~60–70 % lightness (HSL) so they glow against #1c1c1c flat
 * and rgba(255,255,255,0.10) glass surfaces without going neon.
 *
 * Imported by both theme.js (full React runtime) and themeInit.js (pre-paint flash prevention).
 */
export const ACCENT_COLORS = [
  // name            light hex   light fg   dark hex    dark fg
  { name: 'Matte Black', hex: '#111111', fg: '#ffffff', darkHex: '#d4d4d4', darkFg: '#000000' }, // light 18.9:1 AAA | dark 14.2:1 AAA
  { name: 'Blueberry',   hex: '#1868CF', fg: '#ffffff', darkHex: '#5AAEFF', darkFg: '#000000' }, // light  5.4:1 AA  | dark  8.9:1 AAA
  { name: 'Strawberry',  hex: '#C6262E', fg: '#ffffff', darkHex: '#FF6B78', darkFg: '#000000' }, // light  5.6:1 AA  | dark  7.6:1 AAA
  { name: 'Bubblegum',   hex: '#BF2E6E', fg: '#ffffff', darkHex: '#FF79B6', darkFg: '#000000' }, // light  5.5:1 AA  | dark  8.7:1 AAA
  { name: 'Grape',       hex: '#7E32B8', fg: '#ffffff', darkHex: '#C08BFF', darkFg: '#000000' }, // light  6.9:1 AA  | dark  8.4:1 AAA
  { name: 'Orange',      hex: '#B54E00', fg: '#ffffff', darkHex: '#FF9147', darkFg: '#000000' }, // light  5.2:1 AA  | dark  9.4:1 AAA
  { name: 'Banana',      hex: '#8B6500', fg: '#ffffff', darkHex: '#FFC83A', darkFg: '#000000' }, // light  5.3:1 AA  | dark 13.6:1 AAA
  { name: 'Lime',        hex: '#3E7A0A', fg: '#ffffff', darkHex: '#7EDE38', darkFg: '#000000' }, // light  5.3:1 AA  | dark 12.4:1 AAA
  { name: 'Mint',        hex: '#157A6A', fg: '#ffffff', darkHex: '#3DCFB8', darkFg: '#000000' }, // light  5.2:1 AA  | dark 10.8:1 AAA
  { name: 'Latte',       hex: '#8B6228', fg: '#ffffff', darkHex: '#DCAB4E', darkFg: '#000000' }, // light  5.4:1 AA  | dark 10.0:1 AAA
  { name: 'Cocoa',       hex: '#715344', fg: '#ffffff', darkHex: '#D4907F', darkFg: '#000000' }, // light  6.9:1 AA  | dark  8.1:1 AAA
];

// ─── Focus Mode accent CSS var helpers ───────────────────────────────────────
// Focus Mode always renders over a dark backdrop (photo/orb), so it always
// needs the dark-tone accent regardless of canvas mode setting.

function _hexToRgb(hex) {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}

/**
 * Returns CSS var overrides that pin --w-accent / --w-accent-fg / --w-accent-rgb
 * to the dark-tone variant of the named accent.
 * Spread this onto any element that always renders over a dark surface (FM root
 * div, portalled FM dialogs).
 */
export function getFMAccentVars(accentName) {
  const a = ACCENT_COLORS.find(c => c.name === accentName) || ACCENT_COLORS[1];
  const hex = a.darkHex ?? a.hex;
  const fg  = a.darkFg  ?? a.fg;
  return {
    '--w-accent':     hex,
    '--w-accent-fg':  fg,
    '--w-accent-rgb': _hexToRgb(hex),
  };
}
