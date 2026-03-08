import React from 'react';
import { BaseWidget } from '../BaseWidget';

export const WeatherWidget = ({ onRemove, showRemove }) => {
  // Static data for now
  const weather = {
    condition: 'Cloudy',
    temperature: 25
  };

  return (
    <BaseWidget className="h-full w-full p-6 flex flex-col items-center justify-center text-white" onRemove={onRemove} showRemove={showRemove}>
      <div className="text-lg font-medium text-white/90 tracking-wide uppercase">
        {weather.condition} <span className="font-bold ml-1">{weather.temperature}°C</span>
      </div>
      <svg 
        className="mt-4 w-20 h-20 text-white drop-shadow-md" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <path 
          d="M20 16.58A4.41 4.41 0 0016.59 12c-.2 0-.39.02-.58.06A6 6 0 006 12c0 3.31 2.69 6 6 6h8z" 
          stroke="currentColor" 
          strokeWidth="1.2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path 
          d="M8 19l-1 2" 
          stroke="currentColor" 
          strokeWidth="1.2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <path 
          d="M12 19l-1 2" 
          stroke="currentColor" 
          strokeWidth="1.2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>
    </BaseWidget>
  );
};
