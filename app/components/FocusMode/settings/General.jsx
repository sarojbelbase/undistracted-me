/**
 * General — Date calendar and clock format settings.
 * No Modal wrapper — rendered inside the unified FocusModeSettings dialog.
 */

import { useSettingsStore } from '../../../store';
import { SECTION_CARD_STYLE, SectionLabel } from '../dialog/shared';
import {
  FM_INK_1, FM_INK_3, FM_SURFACE, FM_BORDER,
  FM_ICON_STROKE_MUTED,
} from '../theme';
import { CalendarIcon } from '../../../assets/svg/CalendarIcon';
import { ClockIcon } from '../../../assets/svg/ClockIcon';
import { SegmentedControl } from '../../ui/SegmentedControl';

const IconCalendar = () => <CalendarIcon size={14} color={FM_ICON_STROKE_MUTED} />;
const IconClock = () => <ClockIcon size={14} color={FM_ICON_STROKE_MUTED} />;

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
  // Narrow selectors — a whole-store subscription would re-render the panel on
  // any settings change (accent, mode, notifications, …).
  const dateFormat = useSettingsStore((s) => s.dateFormat);
  const setDateFormat = useSettingsStore((s) => s.setDateFormat);
  const clockFormat = useSettingsStore((s) => s.clockFormat);
  const setClockFormat = useSettingsStore((s) => s.setClockFormat);

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
              ariaLabel="Date Calendar"
              options={[
                { value: 'gregorian', label: 'CE' },
                { value: 'bikramSambat', label: 'BS' },
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
              ariaLabel="Clock Format"
              options={[
                { value: '24h', label: '24h' },
                { value: '12h', label: '12h' },
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
