import React from 'react';

const CALENDAR_TYPES = [
  { label: 'Bikram Sambat (B.S.)', value: 'bs' },
  { label: 'Gregorian (A.D.)', value: 'ad' },
];

export const Settings = ({ widgetId, calendarType, onChange }) => (
  <div className="flex flex-col gap-2">
    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Calendar Format</span>
    {CALENDAR_TYPES.map(({ label, value }) => (
      <label key={value} className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={`${widgetId}-calendar-type`}
          value={value}
          checked={calendarType === value}
          onChange={() => onChange('calendarType', value)}
          className="accent-blue-500"
        />
        <span className="text-sm text-gray-700">{label}</span>
      </label>
    ))}
  </div>
);
