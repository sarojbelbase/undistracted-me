import { useState, useEffect, useRef } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { getProgress } from './utils';
import { Settings } from './Settings';
import config from './config';
import { onClockTick } from '../../utilities/sharedClock';
import { WIDGET_SETTINGS_DEFAULTS } from '../../constants/defaults.js';

const DEFAULT_SETTINGS = WIDGET_SETTINGS_DEFAULTS.progress;

export const Widget = ({ id = 'progress', onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULT_SETTINGS);
  const { period, calendar } = settings;

  const [progress, setProgress] = useState(() => getProgress(period, calendar));

  const lastMinuteRef = useRef(-1);
  useEffect(() => {
    // Commit only when a visible field actually changes: year/month progress
    // would otherwise re-render 1,440×/day (every minute) while the integer
    // percentage changes ~every 3.6 days.
    const commit = () => {
      const next = getProgress(period, calendar);
      setProgress((prev) =>
        prev &&
        prev.percentage === next.percentage &&
        prev.filledDots === next.filledDots &&
        prev.label === next.label &&
        prev.subtitle === next.subtitle
          ? prev
          : next,
      );
    };
    // Reflect setting changes immediately (don't wait for the next minute tick).
    lastMinuteRef.current = -1;
    commit();
    return onClockTick(() => {
      const m = new Date().getMinutes();
      if (m === lastMinuteRef.current) return;
      lastMinuteRef.current = m;
      commit();
    });
  }, [period, calendar]);

  const settingsContent = (
    <Settings period={period} calendar={calendar} onChange={updateSetting} />
  );

  return (
    <BaseWidget className="p-4 flex flex-col" settingsTitle={config.title} settingsContent={settingsContent} onRemove={onRemove}>
      <div className="flex justify-between mx-2 items-baseline gap-2">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span className="w-sub-soft truncate">{progress.label} Progress</span>
        </div>
        <span className="prg-pct">{progress.percentage}%</span>
      </div>
      <div className="flex-1 flex items-center">
        <div
          role="progressbar"
          aria-label={`${progress.label} progress`}
          aria-valuenow={progress.percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          className="grid grid-cols-6 gap-y-3 w-full place-items-center"
        >
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
