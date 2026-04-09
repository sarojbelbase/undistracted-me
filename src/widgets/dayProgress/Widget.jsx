import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { getProgress, DEFAULT_PERIOD, DEFAULT_CALENDAR } from './utils';
import { Settings } from './Settings';

const DEFAULT_SETTINGS = { period: DEFAULT_PERIOD, calendar: DEFAULT_CALENDAR };

export const Widget = ({ id = 'dayProgress', onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULT_SETTINGS);
  const { period, calendar } = settings;

  const [progress, setProgress] = useState(() => getProgress(period, calendar));

  useEffect(() => {
    const update = () => setProgress(getProgress(period, calendar));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [period, calendar]);

  const settingsContent = (
    <Settings period={period} calendar={calendar} onChange={updateSetting} />
  );

  return (
    <BaseWidget className="p-4 flex flex-col" settingsContent={settingsContent} onRemove={onRemove}>
      <div className="flex justify-between mx-2 items-baseline gap-2">
        <div className="flex flex-col min-w-0">
          <span className="w-sub-soft truncate">{progress.label} Progress</span>
          {progress.subtitle && (
            <span className="truncate" style={{ fontSize: '0.7rem', color: 'var(--w-ink-5)', lineHeight: 1.3 }}>
              {progress.subtitle}
            </span>
          )}
        </div>
        <span className="w-sub-bold shrink-0" style={{ fontSize: '1.05rem' }}>{progress.percentage}%</span>
      </div>
      <div className="flex-1 flex items-center">
        <div className="grid grid-cols-6 gap-y-3 w-full place-items-center">
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className={`w-dot${i < progress.filledDots ? ' w-dot-active' : ''}`}
            />
          ))}
        </div>
      </div>
    </BaseWidget>
  );
};
