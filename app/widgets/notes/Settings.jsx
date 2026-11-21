/**
 * Notes widget settings: the "⋯ → Settings" panel for the Notes widget.
 *
 * These settings drive the Note Mode full-screen top bar (weather + clock +
 * date), which reads the same per-widget settings slot for widgetId "notes".
 */

import { Toggle } from '../../components/ui/Toggle';
import { SegmentedControl } from '../../components/ui/SegmentedControl';

const DATE_TABS = [
  { value: 'gregorian', label: 'CE' },
  { value: 'bikramSambat', label: 'BS' },
];

const ToggleRow = ({ label, description, checked, onChange, ariaLabel }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
  }}>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--w-ink-1)', lineHeight: '1.3' }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: 'var(--w-ink-4)', marginTop: 2, lineHeight: '1.4' }}>
        {description}
      </div>
    </div>
    <Toggle checked={checked} onChange={onChange} ariaLabel={ariaLabel} />
  </div>
);

export const Settings = ({ id, showClock, showWeather, dateFormat, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <ToggleRow
      label="Clock & date"
      description="Show time and date in Note Mode"
      checked={showClock}
      onChange={(v) => onChange('showClock', v)}
      ariaLabel="Show clock and date"
    />
    <ToggleRow
      label="Weather"
      description="Show current conditions in Note Mode"
      checked={showWeather}
      onChange={(v) => onChange('showWeather', v)}
      ariaLabel="Show weather"
    />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="w-label">Date calendar</span>
      <SegmentedControl
        ariaLabel="Date calendar"
        options={DATE_TABS}
        value={dateFormat || 'gregorian'}
        onChange={(v) => onChange('dateFormat', v)}
      />
    </div>
  </div>
);
