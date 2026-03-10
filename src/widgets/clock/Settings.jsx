import React from 'react';

export const Settings = ({ widgetId, format, onChange }) => (
  <div className="flex flex-col gap-2">
    <span className="w-label">Time Format</span>
    {[
      { label: '24-hour', value: '24h' },
      { label: '12-hour (AM/PM)', value: '12h' },
    ].map(({ label, value }) => (
      <label key={value} className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={`${widgetId}-format`}
          value={value}
          checked={format === value}
          onChange={() => onChange('format', value)}
          className="accent-blue-500"
        />
        <span className="w-body font-normal">{label}</span>
      </label>
    ))}
  </div>
);
