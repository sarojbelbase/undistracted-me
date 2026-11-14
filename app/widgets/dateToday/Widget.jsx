import { useState, useEffect, useRef } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import config from './config';
import { WIDGET_SETTINGS_DEFAULTS } from '../../constants/defaults.js';
import { getDateParts } from './utils';
import { onClockTick } from '../../utilities/sharedClock';

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, WIDGET_SETTINGS_DEFAULTS.dateToday);
  const { language } = settings;

  const [parts, setParts] = useState(() => getDateParts(language));
  // Tracks the last rendered date key so we only re-render when the day actually
  // rolls over — onClockTick fires every second, but the date changes once/day.
  const lastKeyRef = useRef('');

  useEffect(() => {
    const tick = () => {
      const p = getDateParts(language);
      const key = `${p.year}|${p.month}|${p.day}`;
      if (key === lastKeyRef.current) return;
      lastKeyRef.current = key;
      setParts(p);
    };
    tick();
    return onClockTick(tick);
  }, [language]);

  return (
    <BaseWidget
      className="p-4 flex flex-col items-center justify-center"
      settingsTitle={config.title}
      settingsContent={<Settings id={id} language={language} onChange={updateSetting} />}
      onRemove={onRemove}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="w-title-soft">{parts.weekday}</span>
        <span className="w-title-bold">{parts.month}</span>
      </div>
      <div className="flex items-end">
        <span className="w-display text-[clamp(4rem,9vw,7rem)]">
          {parts.day}
        </span>
      </div>
    </BaseWidget>
  );
};
