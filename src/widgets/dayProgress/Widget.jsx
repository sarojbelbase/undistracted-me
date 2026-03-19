import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';
import { getDayProgress, TOTAL_DOTS } from './utils';

export const Widget = ({ onRemove }) => {
  const [progress, setProgress] = useState(() => getDayProgress());

  useEffect(() => {
    const update = () => setProgress(getDayProgress());
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <BaseWidget className="p-4 flex flex-col" onRemove={onRemove}>
      <div className="flex justify-between mx-2">
        <span className="w-title-soft">Day</span>
        <span className="w-title-bold">{progress.percentage}%</span>
      </div>
      <div className="flex-1 flex items-center">
        <div className="grid grid-cols-6 gap-y-3 w-full place-items-center">
          {Array.from({ length: TOTAL_DOTS }, (_, i) => (
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
