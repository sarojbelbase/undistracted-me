/**
 * RadioGroup — reusable labelled radio-button list for widget settings panels.
 *
 * Props:
 *  name      – HTML radio input name (should be unique per widget + field)
 *  label     – Section label text shown above the options (optional)
 *  options   – Array of { label: string, value: string }
 *  value     – Currently selected value
 *  onChange  – (newValue: string) => void
 *
 * Example:
 *   <RadioGroup
 *     name="clock-format"
 *     label="Time Format"
 *     options={[{ label: '24h', value: '24h' }, { label: '12h', value: '12h' }]}
 *     value={format}
 *     onChange={(v) => onChange('format', v)}
 *   />
 */
export const RadioGroup = ({ name, label, options, value, onChange }) => (
  <div className="flex flex-col gap-2">
    {label && <span className="w-label">{label}</span>}
    {options.map((opt) => (
      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={name}
          value={opt.value}
          checked={value === opt.value}
          onChange={() => onChange(opt.value)}
          className="accent-[color:var(--w-accent)]"
        />
        <span className="w-body font-normal">{opt.label}</span>
      </label>
    ))}
  </div>
);
