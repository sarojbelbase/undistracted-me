import React from 'react';
import { BaseWidget } from '../BaseWidget';

export const WeatherWidget = ({ onRemove, showRemove }) => {
  const weather = { condition: 'Cloudy', temperature: 25 };

  return (
    <BaseWidget className="p-6 flex flex-col items-center justify-center" onRemove={onRemove} showRemove={showRemove}>
      <div className="text-sm text-gray-500">
        {weather.condition} <span className="font-semibold text-gray-900">{weather.temperature}°C</span>
      </div>
      <svg
        className="mt-4 w-16 h-16 text-gray-900"
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Cloud body (filled) */}
        <path d="M20 16.58A4.5 4.5 0 0 0 16.5 8a.5.5 0 0 0-.08.01 6.5 6.5 0 0 0-12.92 1.5A4 4 0 0 0 6 18h10.5a4.5 4.5 0 0 0 3.5-1.42z" />
        {/* Rain drops */}
        <line x1="8" y1="19" x2="7" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="19" x2="11" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </BaseWidget>
  );
};
