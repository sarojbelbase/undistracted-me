/**
 * SegmentedControl — horizontal pill-track toggle for widget settings panels.
 *
 * Renders a subtle pill-shaped container (track) where exactly one option is
 * active (raised pill). Uses design-system CSS vars so it adapts automatically
 * to theme/accent changes.
 *
 * Props:
 *  label    – Section label shown above the control (optional)
 *  options  – Array of { label: string, value: string }
 *  value    – Currently selected value
 *  onChange – (newValue: string) => void
 *  inline   – true = size to content (e.g. Pocket toolbar "Group by");
 *             false (default) = fill the parent width (settings rows)
 *  ariaLabel – accessible group name (falls back to label)
 *
 * Example:
 *   <SegmentedControl
 *     label="Time Format"
 *     options={[{ label: '24h', value: '24h' }, { label: '12h (AM/PM)', value: '12h' }]}
 *     value={format}
 *     onChange={(v) => onChange('format', v)}
 *   />
 */
export const SegmentedControl = ({ label, options, value, onChange, inline = false, ariaLabel }) => {
  const track = (
    <div
      className={`um-seg ${inline ? "" : "um-seg--full"}`}
      role="group"
      aria-label={ariaLabel || label}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  if (!label) return track;

  return (
    <div className="flex flex-col gap-2">
      <span className="w-label">{label}</span>
      {track}
    </div>
  );
};
