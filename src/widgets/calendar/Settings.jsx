import { RadioGroup } from '../../components/ui/RadioGroup';

const CALENDAR_TYPES = [
  { label: 'Bikram Sambat (B.S.)', value: 'bs' },
  { label: 'Gregorian (A.D.)', value: 'ad' },
];

export const Settings = ({ id, calendarType, onChange }) => (
  <RadioGroup
    name={`${id}-calendar-type`}
    label="Calendar Format"
    options={CALENDAR_TYPES}
    value={calendarType}
    onChange={(v) => onChange('calendarType', v)}
  />
);
