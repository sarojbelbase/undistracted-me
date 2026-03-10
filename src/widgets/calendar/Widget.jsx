import React, { useState, useEffect, useRef } from 'react';
import { BaseWidget } from '../BaseWidget';
import { convertEnglishToNepali, getTimeZoneAwareDayJsInstance } from '../../utilities';
import { MONTH_NAMES as NEPALI_MONTH_NAMES, NEPALI_YEARS_AND_DAYS_IN_MONTHS } from '../../constants';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import { useEvents } from '../useEvents';

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const BASE_NEPALI_YEAR = 2000;
const AD_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DEFAULTS = { calendarType: 'bs' };

// Tooltip that shows on hover, closes on mouse-leave / blur
const DayCell = ({ day, isWeekend, isCurrent, eventsForDay }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hasEvents = !isCurrent && eventsForDay.length > 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative flex flex-col items-center"
      onMouseEnter={() => hasEvents && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div
        className={`py-1 text-sm font-semibold leading-6 w-7 h-7 mx-auto flex items-center justify-center rounded-full
          ${isCurrent ? '' : day ? 'hover:bg-gray-100 cursor-default transition-colors' : ''}`}
        style={isCurrent
          ? { backgroundColor: 'var(--w-ink-1)', color: '#ffffff' }
          : day ? { color: isWeekend ? 'var(--w-ink-5)' : 'var(--w-ink-4)' } : undefined}
      >
        {day || ''}
      </div>
      {hasEvents && (
        <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: 'var(--w-ink-6)' }} />
      )}
      {open && (
        <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 bg-white border border-gray-100 rounded-xl shadow-lg p-2 min-w-[120px] w-max max-w-[180px] animate-fade-in">
          {eventsForDay.map(e => (
            <div key={e.id} className="w-caption font-medium truncate py-0.5">{e.title}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export const Widget = ({ id: widgetId }) => {
  const [settings, updateSetting] = useWidgetSettings(widgetId || 'calendar', DEFAULTS);
  const { calendarType } = settings;
  const [calendarData, setCalendarData] = useState({ label: '', sublabel: '', days: [], year: 0, month: 0 });
  const [events] = useEvents();

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
        setCalendarData({ label: NEPALI_MONTH_NAMES[nepaliMonth - 1], sublabel: String(nepaliYear), days, year: nepaliYear, month: nepaliMonth });
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
        setCalendarData({ label: AD_MONTH_NAMES[month - 1], sublabel: String(year), days, year, month });
      }
    };

    update();
    const id = setInterval(update, 3_600_000);
    return () => clearInterval(id);
  }, [calendarType]);

  return (
    <BaseWidget className="p-4 flex flex-col" settingsContent={<Settings widgetId={widgetId || 'calendar'} calendarType={calendarType} onChange={updateSetting} />}>
      <div className="flex items-baseline gap-2">
        <span className="w-heading">{calendarData.label}</span>
        {calendarData.sublabel && (
          <span className="w-caption font-medium">{calendarData.sublabel}</span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-x-1 gap-y-0.5 text-center text-sm flex-1 content-start">
        {WEEK_DAYS.map((day, i) => (
          <div key={day} className="font-bold pb-1" style={{ color: 'var(--w-ink-3)' }}>{day}</div>
        ))}
        {calendarData.days.map((day, index) => {
          const col = index % 7;
          const isWeekend = col === 0 || col === 6;
          // Build YYYY-MM-DD for this cell to match against event startDate
          const dateStr = day.date
            ? `${String(calendarData.year).padStart(4, '0')}-${String(calendarData.month).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`
            : null;
          const eventsForDay = dateStr
            ? events.filter(e => e.startDate === dateStr)
            : [];
          return (
            <DayCell
              key={index}
              day={day.date}
              isCurrent={day.isCurrent}
              isWeekend={isWeekend}
              eventsForDay={eventsForDay}
            />
          );
        })}
      </div>
    </BaseWidget>
  );
};
