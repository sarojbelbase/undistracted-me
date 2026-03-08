import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';

export const CalendarWidget = ({ onRemove, showRemove }) => {
  const [calendarData, setCalendarData] = useState({
    month: '',
    year: '',
    days: []
  });

  useEffect(() => {
    const updateCalendar = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const currentDate = now.getDate();
      
      const days = [];
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDay; i++) {
        days.push({ date: null, isCurrent: false });
      }
      
      // Add the days of the month
      for (let i = 1; i <= daysInMonth; i++) {
        days.push({ date: i, isCurrent: i === currentDate });
      }
      
      setCalendarData({
        month: monthNames[month],
        year: year,
        days: days
      });
    };

    updateCalendar();
    const interval = setInterval(updateCalendar, 3600000); // Update every hour

    return () => clearInterval(interval);
  }, []);

  return (
    <BaseWidget className="h-full w-full p-6 flex flex-col" onRemove={onRemove} showRemove={showRemove}>
      <div className="text-lg font-semibold text-white">{calendarData.month}</div>
      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-sm text-white/60 flex-1 content-start">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
          <div key={day} className="font-medium text-white/50">{day}</div>
        ))}
        {calendarData.days.map((day, index) => (
          <div 
            key={index} 
            className={`py-2 text-white/90 ${day.isCurrent ? 'bg-white text-black font-bold rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]' : ''}`}
          >
            {day.date || ''}
          </div>
        ))}
      </div>
    </BaseWidget>
  );
};
