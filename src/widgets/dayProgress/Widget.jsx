import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';

export const Widget = () => {
  const [progress, setProgress] = useState({ percentage: 0, currentHour: 0 });

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hour = now.getHours();
      const minutes = now.getMinutes();
      setProgress({
        percentage: Math.floor(((hour * 60 + minutes) / (24 * 60)) * 100),
        currentHour: hour,
      });
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <BaseWidget className="p-4 flex flex-col">
      <div className="flex justify-center gap-1.5">
        <span className="text-base font-semibold text-gray-400">Day</span>
        <span className="text-base font-bold text-gray-700">{progress.percentage}%</span>
      </div>
      <div className="flex-1 flex items-center">
        <div className="grid grid-cols-6 gap-y-3 w-full">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-full justify-self-center ${i < progress.currentHour ? 'bg-gray-900' : 'bg-gray-300'}`}
            />
          ))}
        </div>
      </div>
    </BaseWidget>
  );
};
