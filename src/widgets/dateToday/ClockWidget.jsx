import React, { useState, useEffect, useCallback } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import {
  getTimeZoneAwareDayJsInstance,
  convertEnglishToNepali,
  convertThisNumberToNepali,
} from '../../utilities';
import {
  LANGUAGES,
  MONTH_NAMES_IN_NEPALI,
  DAY_NAMES,
} from '../../constants';

const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getDateParts = (language) => {
  const now = getTimeZoneAwareDayJsInstance();
  const weekdayIndex = now.day(); // 0 = Sun … 6 = Sat

  if (language === LANGUAGES.ne) {
    const [y, m, d] = now.format('YYYY M D').split(' ').map(Number);
    const [, nepaliMonthStr, nepaliDayStr] = convertEnglishToNepali(y, m, d).split(' ');
    const nepaliMonth = parseInt(nepaliMonthStr);
    const nepaliDay = parseInt(nepaliDayStr);
    return {
      weekday: DAY_NAMES[weekdayIndex],
      month: MONTH_NAMES_IN_NEPALI[nepaliMonth - 1],
      day: convertThisNumberToNepali(nepaliDay),
    };
  }

  return {
    weekday: EN_WEEKDAYS[weekdayIndex],
    month: EN_MONTHS[now.month()],
    day: String(now.date()),
  };
};

export const ClockWidget = ({ widgetId }) => {
  const [settings, updateSetting] = useWidgetSettings(widgetId, { language: LANGUAGES.en });
  const { language } = settings;

  const [parts, setParts] = useState(() => getDateParts(language));

  const update = useCallback(() => setParts(getDateParts(language)), [language]);

  useEffect(() => {
    update();
    // Update every minute — only date parts, no seconds needed
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [update]);

  const settingsContent = (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Language</span>
      {[
        { label: 'English', value: LANGUAGES.en },
        { label: 'Nepali', value: LANGUAGES.ne },
      ].map(({ label, value }) => (
        <label key={value} className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={`${widgetId}-lang`}
            value={value}
            checked={language === value}
            onChange={() => updateSetting('language', value)}
            className="accent-blue-500"
          />
          <span className="text-sm text-gray-700">{label}</span>
        </label>
      ))}
    </div>
  );

  return (
    <BaseWidget
      className="p-5 flex flex-col"
      settingsContent={settingsContent}
    >
      {/* Weekday (muted) + Month (darker) — mirrors iOS Calendar header */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-normal text-gray-400">{parts.weekday}</span>
        <span className="text-base font-medium text-gray-700">{parts.month}</span>
      </div>

      {/* Huge date number — bottom of card */}
      <div className="flex-1 flex items-end">
        <span className="text-[clamp(4.5rem,10vw,8rem)] font-bold leading-none text-gray-900">
          {parts.day}
        </span>
      </div>
    </BaseWidget>
  );
};

