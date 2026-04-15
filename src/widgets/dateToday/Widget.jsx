import React, { useState, useEffect, useCallback } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import { LANGUAGES } from '../../constants';
import { getDateParts } from './utils';

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, { language: LANGUAGES.en });
  const { language } = settings;

  const [parts, setParts] = useState(() => getDateParts(language));
  const update = useCallback(() => setParts(getDateParts(language)), [language]);

  useEffect(() => {
    update();
    const timerId = setInterval(update, 60_000);
    return () => clearInterval(timerId);
  }, [update]);

  return (
    <BaseWidget
      className="p-4 flex flex-col items-center justify-center"
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
