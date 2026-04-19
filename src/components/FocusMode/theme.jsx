// ─── Focus Mode panel shared theme ────────────────────────────────────────────
//
// Focus Mode panels always render over a dark photo backdrop.
// Colors use --w-ink-* and --w-surface-* CSS vars, which are pinned to their
// dark-mode values on .fm-left-panel in App.css — so panels look correct
// regardless of whether the app is in light or dark mode.
//
// To restyle the entire left panel column, edit the tokens here or the
// overrides in App.css. Individual panel files must NOT define their own
// color constants — they must import and reference this module.

export const FOCUS_THEME = {
  card: {
    background: 'rgba(4,5,7,0.68)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    border: '1px solid var(--w-border)',
    borderRadius: '14px',
  },
  label: 'var(--w-ink-4)',
  text: 'var(--w-ink-1)',
  sub: 'var(--w-ink-3)',
  track: 'var(--w-surface)',
  btnBg: 'var(--w-surface-2)',
  btnBorder: 'var(--w-border)',
  btnColor: 'var(--w-ink-1)',
  btnIcon: 'var(--w-ink-4)',
};

// Spring-in card wrapper — stagger delay in ms
export const AnimatedCard = ({ delay, children }) => (
  <div style={{ animation: `panelCardIn 0.52s cubic-bezier(0.16,1,0.3,1) ${delay}ms both` }}>
    {children}
  </div>
);

// ─── Search bar inline style tokens ───────────────────────────────────────────
//
// The search bar switches between dark/light palettes based on image luminance
// (centerOnDark). These are JS objects used as inline styles — not CSS vars —
// because the choice is made at runtime, not at theme-load time.

const DARK_TOKENS = {
  pillBg: 'rgba(255,255,255,0.13)',
  pillBgFocused: 'rgba(255,255,255,0.18)',
  pillBorder: 'rgba(255,255,255,0.22)',
  pillBorderFoc: 'rgba(255,255,255,0.36)',
  shadowFocused: '0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)',
  shadow: '0 2px 20px rgba(0,0,0,0.40)',
  textColor: 'rgba(255,255,255,0.96)',
  placeholder: 'rgba(255,255,255,0.68)',
  placeholderShadow: '0 1px 6px rgba(0,0,0,0.75)',
  divider: 'rgba(255,255,255,0.10)',
  dropBg: 'rgba(10,10,14,0.88)',
  dropBorder: 'rgba(255,255,255,0.10)',
  dropShadow: '0 8px 32px rgba(0,0,0,0.55)',
  hoverBg: 'rgba(255,255,255,0.07)',
  activeBg: 'rgba(255,255,255,0.12)',
  selectedBg: 'rgba(255,255,255,0.10)',
  btnHoverBg: 'rgba(255,255,255,0.18)',
  btnBg: 'rgba(255,255,255,0.10)',
  suggText: 'rgba(255,255,255,0.82)',
  selectedText: 'rgba(255,255,255,0.92)',
  label: 'rgba(255,255,255,0.35)',
  caret: 'rgba(255,255,255,0.7)',
  iconStroke: 'rgba(255,255,255,0.78)',
  chevron: 'white',
};

const LIGHT_TOKENS = {
  pillBg: 'rgba(0,0,0,0.16)',
  pillBgFocused: 'rgba(0,0,0,0.22)',
  pillBorder: 'rgba(0,0,0,0.22)',
  pillBorderFoc: 'rgba(0,0,0,0.34)',
  shadowFocused: '0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.9)',
  shadow: '0 2px 14px rgba(0,0,0,0.16)',
  textColor: 'rgba(0,0,0,0.92)',
  placeholder: 'rgba(0,0,0,0.58)',
  placeholderShadow: 'none',
  divider: 'rgba(0,0,0,0.08)',
  dropBg: 'rgba(255,255,255,0.94)',
  dropBorder: 'rgba(0,0,0,0.08)',
  dropShadow: '0 8px 24px rgba(0,0,0,0.14)',
  hoverBg: 'rgba(0,0,0,0.05)',
  activeBg: 'rgba(0,0,0,0.08)',
  selectedBg: 'rgba(0,0,0,0.06)',
  btnHoverBg: 'rgba(0,0,0,0.13)',
  btnBg: 'rgba(0,0,0,0.07)',
  suggText: 'rgba(0,0,0,0.78)',
  selectedText: 'rgba(0,0,0,0.88)',
  label: 'rgba(0,0,0,0.30)',
  caret: 'rgba(0,0,0,0.6)',
  iconStroke: 'rgba(0,0,0,0.60)',
  chevron: 'black',
};

export function getTokens(dark) {
  return dark ? DARK_TOKENS : LIGHT_TOKENS;
}
