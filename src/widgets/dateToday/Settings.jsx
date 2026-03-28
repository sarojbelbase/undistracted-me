import { RadioGroup } from '../../components/ui/RadioGroup';
import { LANGUAGES } from '../../constants';

const DATE_FORMAT_OPTIONS = [
  { label: 'Gregorian (A.D.)', value: LANGUAGES.en },
  { label: 'Bikram Sambat (B.S.)', value: LANGUAGES.ne },
];

export const Settings = ({ id, language, onChange }) => (
  <RadioGroup
    name={`${id}-lang`}
    label="Date Format"
    options={DATE_FORMAT_OPTIONS}
    value={language}
    onChange={(v) => onChange('language', v)}
  />
);
