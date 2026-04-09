/**
 * PillButton — a single pill-shaped toggle button with active/inactive states.
 *
 * Props:
 *  active    – Whether this option is currently selected
 *  tinted    – When true, active state uses accent-tinted bg (like TintedChip) instead of solid accent
 *  onClick   – Click handler
 *  children  – Button label text
 */
export const PillButton = ({ active, tinted = false, onClick, children }) => {
  let activeStyle;
  if (active && tinted) {
    activeStyle = {
      background: 'color-mix(in srgb, var(--w-accent) 14%, transparent)',
      color: 'var(--w-accent)',
      border: '1px solid color-mix(in srgb, var(--w-accent) 30%, transparent)',
    };
  } else if (active) {
    activeStyle = { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)', border: '1px solid transparent' };
  } else {
    activeStyle = { backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', color: 'var(--w-ink-3)', border: '1px solid var(--card-border)' };
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer"
      style={activeStyle}
    >
      {children}
    </button>
  );
};
