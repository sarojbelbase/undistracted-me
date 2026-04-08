import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { getProgressForRange, PRESETS } from './utils';
import { Settings } from './Settings';

const DEFAULT_SETTINGS = { preset: 'day', customLabel: '', customStart: 9, customEnd: 17 };

export const Widget = ({ id = 'dayProgress', onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULT_SETTINGS);
  const { preset, customLabel, customStart, customEnd } = settings;

  // Resolve the active range from the selected preset
  const activePreset = PRESETS.find(p => p.id === preset) || PRESETS[0];
  const startHour = preset === 'custom' ? (customStart ?? 9) : activePreset.startHour;
  const endHour = preset === 'custom' ? (customEnd ?? 17) : activePreset.endHour;
  const title = preset === 'custom'
    ? (customLabel?.trim() || 'My Schedule')
    : activePreset.label;

  const [progress, setProgress] = useState(() => getProgressForRange(startHour, endHour));

  useEffect(() => {
    const update = () => setProgress(getProgressForRange(startHour, endHour));
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [startHour, endHour]);

  const settingsContent = (
    <Settings
      preset={preset}
      customLabel={customLabel}
      customStart={customStart}
      customEnd={customEnd}
      onChange={updateSetting}
    />
  );

  return (
    <BaseWidget className="p-4 flex flex-col" settingsContent={settingsContent} onRemove={onRemove}>
      <div className="flex justify-between mx-2 items-baseline">
        <span className="w-sub-soft">{title}</span>
        <span className="w-sub-bold" style={{ fontSize: '1.05rem' }}>{progress.percentage}%</span>
      </div>
      <div className="flex-1 flex items-center">
        <div className="grid grid-cols-6 gap-y-3 w-full place-items-center">
          {Array.from({ length: progress.totalDots }, (_, i) => (
            <div
              key={i}
              title="1 hour"
              className={`w-dot${i < progress.filledDots ? ' w-dot-active' : ''}`}
            />
          ))}
        </div>
      </div>
    </BaseWidget>
  );
};
