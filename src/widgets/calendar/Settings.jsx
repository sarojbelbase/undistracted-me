import { SegmentedControl } from '../../components/ui/SegmentedControl';

const CALENDAR_TYPES = [
  { label: 'Bikram Sambat (B.S.)', value: 'bs' },
  { label: 'Gregorian (A.D.)', value: 'ad' },
];

export const Settings = ({ id, calendarType, onChange }) => (
  <SegmentedControl
    label="Calendar Format"
    options={CALENDAR_TYPES}
    value={calendarType}
    onChange={(v) => onChange('calendarType', v)}
  />
);
