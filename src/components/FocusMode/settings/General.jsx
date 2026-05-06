/**
 * General — Date calendar and clock format settings.
 * No Modal wrapper — rendered inside the unified FocusModeSettings dialog.
 */

import React from 'react';
import { useSettingsStore } from '../../../store';
import { SECTION_CARD_STYLE, SectionLabel } from '../dialog/shared';
import {
  FM_INK_1, FM_INK_3, FM_SURFACE, FM_BORDER,
  FM_ICON_STROKE_MUTED,
} from '../theme';
import { CalendarIcon } from '../../../assets/svg/CalendarIcon';
import { ClockIcon } from '../../../assets/svg/ClockIcon';

const IconCalendar = () => <CalendarIcon size={14} color={FM_ICON_STROKE_MUTED} />;
const IconClock = () => <ClockIcon size={14} color={FM_ICON_STROKE_MUTED} />;

const SegmentedControl = ({ options, value, onChange }) => (
  <div
    style={{
      display: 'flex', gap: 2, padding: 3,
      borderRadius: 10,
      background: FM_SURFACE,
      border: `1px solid ${FM_BORDER}`,
    }}
  >
    {options.map(({ id, label }) => (
      <button
        key={id}
        type="button"
        onClick={() => onChange(id)}
        style={{
          flex: 1,
          padding: '5px 0',
          borderRadius: 7,
          border: 'none',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.02em',
          transition: 'all 0.15s ease',
          background: value === id ? 'var(--w-accent)' : 'transparent',
          color: value === id ? 'var(--w-accent-fg)' : FM_INK_3,
        }}
      >
        {label}
      </button>
    ))}
  </div>
);

// ─── Setting row (icon + label/description + control) ────────────────────────

const SettingRow = ({ icon, label, description, control }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 14px',
  }}>
    <div style={{
      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
      background: FM_SURFACE,
      border: `1px solid ${FM_BORDER}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {icon}
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: FM_INK_1, lineHeight: '1.3' }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: FM_INK_3, marginTop: 2, lineHeight: '1.4' }}>
        {description}
      </div>
    </div>
    <div style={{ flexShrink: 0, width: 120 }}>
      {control}
    </div>
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const General = () => {
  const {
    dateFormat, setDateFormat,
    clockFormat, setClockFormat,
  } = useSettingsStore();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <SectionLabel>Display</SectionLabel>

      <div style={SECTION_CARD_STYLE}>
        <SettingRow
          icon={<IconCalendar />}
          label="Date Calendar"
          description="Common Era or Bikram Sambat"
          control={
            <SegmentedControl
              options={[
                { id: 'gregorian', label: 'CE' },
                { id: 'bikramSambat', label: 'BS' },
              ]}
              value={dateFormat || 'gregorian'}
              onChange={setDateFormat}
            />
          }
        />
        <SettingRow
          icon={<IconClock />}
          label="Clock Format"
          description="24-hour or 12-hour with AM/PM"
          control={
            <SegmentedControl
              options={[
                { id: '24h', label: '24h' },
                { id: '12h', label: '12h' },
              ]}
              value={clockFormat || '24h'}
              onChange={setClockFormat}
            />
          }
        />
      </div>
    </div>
  );
};
