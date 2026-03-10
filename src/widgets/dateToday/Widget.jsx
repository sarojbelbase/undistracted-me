import React, { useState, useEffect, useCallback } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import {
  getTimeZoneAwareDayJsInstance,
  convertEnglishToNepali,
} from '../../utilities';
import { LANGUAGES, MONTH_NAMES } from '../../constants';

const EN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getDateParts = (language) => {
  const now = getTimeZoneAwareDayJsInstance();
  const weekdayIndex = now.day();

  if (language === LANGUAGES.ne) {
    const [y, m, d] = now.format('YYYY M D').split(' ').map(Number);
    const [, nepaliMonthStr, nepaliDayStr] = convertEnglishToNepali(y, m, d).split(' ');
    return {
      weekday: EN_WEEKDAYS[weekdayIndex],
      month: MONTH_NAMES[parseInt(nepaliMonthStr) - 1],
      day: String(parseInt(nepaliDayStr)).padStart(2, '0'),
    };
  }

  return {
    weekday: EN_WEEKDAYS[weekdayIndex],
    month: EN_MONTHS[now.month()],
    day: String(now.date()).padStart(2, '0'),
  };
};

export const Widget = ({ widgetId }) => {
  const [settings, updateSetting] = useWidgetSettings(widgetId, { language: LANGUAGES.en });
  const { language } = settings;

  const [parts, setParts] = useState(() => getDateParts(language));
  const update = useCallback(() => setParts(getDateParts(language)), [language]);

  useEffect(() => {
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [update]);

  return (
    <BaseWidget
      className="p-4 flex flex-col items-center justify-center"
      settingsContent={<Settings widgetId={widgetId} language={language} onChange={updateSetting} />}
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
