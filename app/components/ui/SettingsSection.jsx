import { Toggle } from './Toggle';

/**
 * Settings primitives — the shared layout + typography for widget settings
 * panels. Single source of truth for the field-label caption (w-label) and the
 * common field layouts, so every widget settings panel reads the same.
 *
 *   SettingsSection   – a titled group of fields
 *   SettingsField     – a label-on-top control (Select, Input, …)
 *   SettingsToggleRow – a label with an on/off Toggle on the same row
 */

export const SettingsSection = ({ title, children }) => (
  <div className="flex flex-col gap-2.5">
    {title && <span className="w-label">{title}</span>}
    {children}
  </div>
);

export const SettingsField = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <span className="w-label">{label}</span>
    {children}
  </div>
);

export const SettingsToggleRow = ({ label, hint, checked, onChange, ariaLabel }) => (
  <div className="flex items-start justify-between gap-3">
    <div className="flex flex-col gap-0.5">
      <span className="w-label">{label}</span>
      {hint && <span className="w-caption">{hint}</span>}
    </div>
    <Toggle checked={checked} onChange={onChange} ariaLabel={ariaLabel} />
  </div>
);
