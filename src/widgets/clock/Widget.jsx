import React, { useState, useEffect, useCallback } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import { getTimeParts } from './utils';

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
        <span className="w-display text-[clamp(3rem,5vw,5rem)]">
          {parts.time}
        </span>
        {parts.period && (
          <span className="w-period">{parts.period}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 mt-2">
        <span className="w-sub-soft">{parts.greeting.prefix}</span>
        <span className="w-sub-bold">{parts.greeting.label}</span>
      </div>
    </BaseWidget>
  );
};
