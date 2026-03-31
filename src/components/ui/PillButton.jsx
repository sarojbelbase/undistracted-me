/**
 * PillButton — a single pill-shaped toggle button with active/inactive states.
 *
 * Used wherever an individual option must be toggled on/off within a flex-wrap
 * group (repeat pickers, date chips, duration pickers, etc.).
 * For a fixed equal-width track of mutually-exclusive options prefer SegmentedControl.
 *
 * Props:
 *  active    – Whether this option is currently selected
 *  onClick   – Click handler
 *  children  – Button label text
 *
 * Example:
 *   {REPEAT_OPTIONS.map(opt => (
 *     <PillButton key={opt.value} active={repeat === opt.value} onClick={() => setRepeat(opt.value)}>
 *       {opt.label}
 *     </PillButton>
 *   ))}
 */
export const PillButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className="px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer"
    style={
      active
        ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)', border: '1px solid transparent' }
        : { backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-3)', border: '1px solid var(--w-border)' }
    }
  >
    {children}
  </button>
);
