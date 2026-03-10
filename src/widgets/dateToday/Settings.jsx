import React from 'react';
import { LANGUAGES } from '../../constants';

export const Settings = ({ widgetId, language, onChange }) => (
  <div className="flex flex-col gap-2">
    <span className="w-label">Date Format</span>
    {[
      { label: 'Gregorian (A.D.)', value: LANGUAGES.en },
      { label: 'Bikram Sambat (B.S.)', value: LANGUAGES.ne },
    ].map(({ label, value }) => (
      <label key={value} className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={`${widgetId}-lang`}
          value={value}
          checked={language === value}
          onChange={() => onChange('language', value)}
          className="accent-blue-500"
        />
        <span className="w-body font-normal">{label}</span>
      </label>
    ))}
  </div>
);
