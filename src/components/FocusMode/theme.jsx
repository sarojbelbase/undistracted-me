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
