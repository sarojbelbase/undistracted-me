import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';
import { convertEnglishToNepali, getTimeZoneAwareDayJsInstance } from '../../utilities';
import { MONTH_NAMES as NEPALI_MONTH_NAMES, NEPALI_YEARS_AND_DAYS_IN_MONTHS } from '../../constants';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const BASE_NEPALI_YEAR = 2000;
const AD_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DEFAULTS = { calendarType: 'bs' };

export const Widget = ({ id: widgetId }) => {
  const [settings, updateSetting] = useWidgetSettings(widgetId || 'calendar', DEFAULTS);
  const { calendarType } = settings;
  const [calendarData, setCalendarData] = useState({ label: '', sublabel: '', days: [] });

  useEffect(() => {
    const update = () => {
      const now = getTimeZoneAwareDayJsInstance();
      const year = now.year();
      const month = now.month() + 1;
      const day = now.date();

      if (calendarType === 'bs') {
        const nepaliResult = convertEnglishToNepali(year, month, day);
        const [nepaliYear, nepaliMonth, nepaliDay] = nepaliResult.split(' ').map(Number);
        const daysInNepaliMonth = NEPALI_YEARS_AND_DAYS_IN_MONTHS[nepaliYear - BASE_NEPALI_YEAR][nepaliMonth];
        const firstDayOfMonth = now.subtract(nepaliDay - 1, 'day');
        const offset = firstDayOfMonth.day();
        const days = [
          ...Array.from({ length: offset }, () => ({ date: null, isCurrent: false })),
          ...Array.from({ length: daysInNepaliMonth }, (_, i) => ({
            date: i + 1,
            isCurrent: i + 1 === nepaliDay,
          })),
        ];
        setCalendarData({ label: NEPALI_MONTH_NAMES[nepaliMonth - 1], sublabel: String(nepaliYear), days });
      } else {
        const firstDay = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = [
          ...Array.from({ length: firstDay }, () => ({ date: null, isCurrent: false })),
          ...Array.from({ length: daysInMonth }, (_, i) => ({
            date: i + 1,
            isCurrent: i + 1 === day,
          })),
        ];
        setCalendarData({ label: AD_MONTH_NAMES[month - 1], sublabel: String(year), days });
      }
    };

    update();
    const id = setInterval(update, 3_600_000);
    return () => clearInterval(id);
  }, [calendarType]);

  return (
    <BaseWidget className="p-4 flex flex-col" settingsContent={<Settings widgetId={widgetId || 'calendar'} calendarType={calendarType} onChange={updateSetting} />}>
      <div className="flex items-baseline gap-2">
        <span className="text-medium font-semibold text-gray-900">{calendarData.label}</span>
        {calendarData.sublabel && (
          <span className="text-xs font-medium text-gray-400">{calendarData.sublabel}</span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-x-1 gap-y-0.5 text-center text-sm flex-1 content-start">
        {WEEK_DAYS.map((day, i) => (
          <div key={day} className="font-bold pb-1 text-gray-700">{day}</div>
        ))}
        {calendarData.days.map((day, index) => {
          const col = index % 7;
          const isWeekend = col === 0 || col === 6;
          return (
            <div
              key={index}
              className={`py-1 text-sm font-semibold leading-6 w-7 h-7 mx-auto flex items-center justify-center rounded-full
                ${day.isCurrent
                  ? 'bg-gray-800 text-white'
                  : day.date
                    ? `${isWeekend ? 'text-gray-400' : 'text-gray-600'} hover:bg-gray-100 cursor-default transition-colors`
                    : ''}`}
            >
              {day.date || ''}
            </div>
          );
        })}
      </div>
    </BaseWidget>
  );
};
