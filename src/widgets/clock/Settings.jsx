import React from 'react';
import { LANGUAGES } from '../../constants';

export const Settings = ({ widgetId, language, onChange }) => (
  <div className="flex flex-col gap-2">
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Settings</span>
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
        <span className="text-sm text-gray-700">{label}</span>
      </label>
    ))}
  </div>
);
