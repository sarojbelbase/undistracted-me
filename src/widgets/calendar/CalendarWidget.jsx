import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';

// Week header starting Monday, matching reference image
const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export const CalendarWidget = ({ onRemove, showRemove }) => {
  const [calendarData, setCalendarData] = useState({ month: '', year: '', days: [] });

  useEffect(() => {
    const updateCalendar = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const currentDate = now.getDate();

      // Convert Sunday=0 to Mon-first offset:
      // JS: Sun=0, Mon=1...Sat=6  →  Mon-first: Mon=0, Tue=1...Sun=6
      const offset = (firstDay + 6) % 7;

      const days = [];
      for (let i = 0; i < offset; i++) {
        days.push({ date: null, isCurrent: false });
      }
      for (let i = 1; i <= daysInMonth; i++) {
        days.push({ date: i, isCurrent: i === currentDate });
      }

      setCalendarData({ month: monthNames[month], year, days });
    };

    updateCalendar();
    const interval = setInterval(updateCalendar, 3600000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BaseWidget className="p-6 flex flex-col" onRemove={onRemove} showRemove={showRemove}>
      <div className="text-base font-semibold text-gray-900">{calendarData.month}</div>
      <div className="mt-3 grid grid-cols-7 gap-x-2 gap-y-1 text-center text-sm flex-1 content-start">
        {WEEK_DAYS.map(day => (
          <div key={day} className="text-xs font-medium text-gray-500 pb-1">{day}</div>
        ))}
        {calendarData.days.map((day, index) => (
          <div
            key={index}
            className={`
              py-1 text-sm leading-6 w-7 h-7 mx-auto flex items-center justify-center rounded-full
              ${day.isCurrent
                ? 'bg-gray-900 text-white font-bold'
                : day.date
                  ? 'text-gray-700 hover:bg-gray-100 cursor-default transition-colors'
                  : ''}
            `}
          >
            {day.date || ''}
          </div>
        ))}
      </div>
    </BaseWidget>
  );
};
