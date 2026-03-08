import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';

export const DayProgressWidget = ({ onRemove, showRemove }) => {
  const [progress, setProgress] = useState({ percentage: 0, currentHour: 0 });

  useEffect(() => {
    const updateProgress = () => {
      const now = new Date();
      const hour = now.getHours();
      const minutes = now.getMinutes();
      const percentage = Math.floor(((hour * 60 + minutes) / (24 * 60)) * 100);
      setProgress({ percentage, currentHour: hour });
    };
    updateProgress();
    const interval = setInterval(updateProgress, 60000);
    return () => clearInterval(interval);
  }, []);

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < 24; i++) {
      const isActive = i < progress.currentHour;
      dots.push(
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${isActive ? 'bg-gray-900' : 'bg-gray-300'}`}
        />
      );
    }
    return dots;
  };

  return (
    <BaseWidget className="p-4 flex flex-col items-center justify-center" onRemove={onRemove} showRemove={showRemove}>
      <div className="text-sm text-gray-500">
        Day <span className="text-xs text-gray-400 ml-1">{progress.percentage}%</span>
      </div>
      <div className="mt-3 grid grid-cols-6 gap-2">
        {renderDots()}
      </div>
    </BaseWidget>
  );
};
