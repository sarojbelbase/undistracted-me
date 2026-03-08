import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';

export const ClockWidget = ({ onRemove, showRemove }) => {
  const [dateInfo, setDateInfo] = useState({ day: '', month: '', date: '' });

  useEffect(() => {
    const updateDate = () => {
      const now = new Date();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      setDateInfo({
        day: days[now.getDay()],
        month: months[now.getMonth()],
        date: now.getDate()
      });
    };
    updateDate();
    const interval = setInterval(updateDate, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BaseWidget className="p-6 flex flex-col justify-center" onRemove={onRemove} showRemove={showRemove}>
      <div className="text-sm text-gray-500">
        {dateInfo.day} <span className="font-medium text-gray-700">{dateInfo.month}</span>
      </div>
      <div className="mt-2 text-8xl font-extrabold leading-none text-gray-900 tracking-tighter">
        {dateInfo.date}
      </div>
    </BaseWidget>
  );
};
