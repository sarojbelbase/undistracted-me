/**
 * SegmentedControl — horizontal pill-track toggle for widget settings panels.
 *
 * Renders a pill-shaped container (track) where exactly one option is active.
 * Uses design-system CSS vars so it adapts automatically to theme/accent changes.
 *
 * Props:
 *  label    – Section label shown above the control (optional)
 *  options  – Array of { label: string, value: string }
 *  value    – Currently selected value
 *  onChange – (newValue: string) => void
 *
 * Example:
 *   <SegmentedControl
 *     label="Time Format"
 *     options={[{ label: '24h', value: '24h' }, { label: '12h (AM/PM)', value: '12h' }]}
 *     value={format}
 *     onChange={(v) => onChange('format', v)}
 *   />
 */
export const SegmentedControl = ({ label, options, value, onChange }) => (
  <div className="flex flex-col gap-2">
    {label && <span className="w-label">{label}</span>}
    <div
      className="flex rounded-xl p-0.5"
      style={{ backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)' }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="flex-1 rounded-[10px] text-xs font-semibold py-1.5 transition-all cursor-pointer"
          style={
            value === opt.value
              ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)', border: 'none', outline: 'none' }
              : { background: 'transparent', color: 'var(--w-ink-3)', border: 'none', outline: 'none' }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  </div>
);
