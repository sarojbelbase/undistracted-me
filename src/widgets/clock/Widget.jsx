import React, { useState, useEffect, useCallback } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import { getTimeZoneAwareDayJsInstance } from '../../utilities';

const GREETINGS = [
  { from: 0, prefix: 'burning the', label: 'midnight oil' }, // 0–4
  { from: 5, prefix: 'time to', label: 'rise & shine' }, // 5–8
  { from: 9, prefix: 'deep in the', label: 'morning grind' }, // 9–11
  { from: 12, prefix: 'soaking up the', label: 'midday sun' }, // 12–13
  { from: 14, prefix: 'riding the', label: 'afternoon wave' }, // 14–16
  { from: 17, prefix: 'catching the', label: 'golden hour' }, // 17–18
  { from: 19, prefix: 'easing into', label: 'the evening' }, // 19–21
  { from: 22, prefix: 'burning the', label: 'midnight oil' }, // 22–23
];

const getGreeting = (h24) =>
  [...GREETINGS].reverse().find(g => h24 >= g.from) || GREETINGS[0];

const getTimeParts = (format) => {
  const now = getTimeZoneAwareDayJsInstance();
  const h24 = now.hour();
  const minutes = String(now.minute()).padStart(2, '0');
  const greeting = getGreeting(h24);

  if (format === '24h') {
    return { time: String(h24).padStart(2, '0') + ':' + minutes, period: null, greeting };
  }

  const period = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 || 12;
  return { time: String(h12).padStart(2, '0') + ':' + minutes, period, greeting };
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
