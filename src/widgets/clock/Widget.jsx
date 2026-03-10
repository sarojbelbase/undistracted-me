import React, { useState, useEffect, useCallback } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import { getTimeZoneAwareDayJsInstance } from '../../utilities';

const getTimeParts = (format) => {
  const now = getTimeZoneAwareDayJsInstance();
  const h24 = now.hour();
  const minutes = String(now.minute()).padStart(2, '0');

  if (format === '24h') {
    return { time: String(h24).padStart(2, '0') + ':' + minutes, period: null };
  }

  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 || 12;
  return { time: String(h12).padStart(2, '0') + ':' + minutes, period };
};

export const Widget = ({ widgetId }) => {
  const [settings, updateSetting] = useWidgetSettings(widgetId, { format: '24h' });
  const { format } = settings;

  const [parts, setParts] = useState(() => getTimeParts(format));
  const update = useCallback(() => setParts(getTimeParts(format)), [format]);

  useEffect(() => {
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [update]);

  return (
    <BaseWidget
      className="p-4 flex flex-col items-center justify-center"
      settingsContent={<Settings widgetId={widgetId} format={format} onChange={updateSetting} />}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[clamp(3rem,5vw,5rem)] font-bold leading-none tracking-tight text-gray-800">
          {parts.time}
        </span>
        {parts.period && (
          <span className="text-xl font-semibold text-gray-400">{parts.period}</span>
        )}
      </div>
    </BaseWidget>
  );
};
