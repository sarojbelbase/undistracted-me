import { SegmentedControl } from '../../components/ui/SegmentedControl';

const CALENDAR_TYPES = [
  { label: 'Bikram Sambat (B.S.)', value: 'bs' },
  { label: 'Gregorian (A.D.)', value: 'ad' },
];

const HOLIDAY_OPTIONS = [
  { label: 'Show', value: true },
  { label: 'Hide', value: false },
];

export const Settings = ({ id, calendarType, showHolidays, onChange }) => (
  <div className="flex flex-col gap-5">
    <SegmentedControl
      label="Calendar Format"
      options={CALENDAR_TYPES}
      value={calendarType}
      onChange={(v) => onChange('calendarType', v)}
    />

    <SegmentedControl
      label="Holidays"
      options={HOLIDAY_OPTIONS}
      value={showHolidays}
      onChange={(v) => onChange('showHolidays', v)}
    />
  </div>
);
