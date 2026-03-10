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
      <div className="flex justify-between mx-2">
        <span className="w-title-soft">Day</span>
        <span className="w-title-bold">{progress.percentage}%</span>
      </div>
      <div className="flex-1 flex items-center">
        <div className="grid grid-cols-6 gap-y-3 w-full place-items-center">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              title='1 hour'
              className={`w-dot${i < progress.currentHour ? ' w-dot-active' : ''}`}
            />
          ))}
        </div>
      </div>
    </BaseWidget>
  );
};
