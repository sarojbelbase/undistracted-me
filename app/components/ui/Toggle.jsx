/**
 * Toggle — iOS-style on/off switch used across settings panels.
 *
 * Adds subtle depth (inset track + thumb shadow) and an accent-tinted glow to
 * match the SegmentedControl's accent + depth feel.
 *
 * Props:
 *   checked   – boolean, whether the toggle is on
 *   onChange  – (next: boolean) => void
 *   ariaLabel – accessible name for the switch (required for a11y)
 */

export const Toggle = ({ checked, onChange, ariaLabel }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    onClick={() => onChange(!checked)}
    style={{
      flexShrink: 0,
      width: 36, height: 20, borderRadius: 10, padding: 2,
      border: 'none', cursor: 'pointer',
      background: checked ? 'var(--w-accent)' : 'var(--w-ink-6)',
      boxShadow: checked
        ? 'inset 0 1px 2px rgba(0,0,0,0.16), 0 1px 2px color-mix(in srgb, var(--w-accent) 45%, transparent)'
        : 'inset 0 1px 2px rgba(0,0,0,0.10)',
      transition: 'background 0.18s ease, box-shadow 0.18s ease',
    }}
  >
    <div style={{
      width: 16, height: 16, borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.32), 0 0 1px rgba(0,0,0,0.14)',
      transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: checked ? 'translateX(16px)' : 'translateX(0)',
    }} />
  </button>
);
