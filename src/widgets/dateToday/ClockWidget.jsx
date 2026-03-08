import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';

export const ClockWidget = ({ onRemove, showRemove }) => {
  const [dateInfo, setDateInfo] = useState({
    day: '',
    month: '',
    date: ''
  });

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
    const interval = setInterval(updateDate, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <BaseWidget className="h-full w-full p-6 flex flex-col justify-center" onRemove={onRemove} showRemove={showRemove}>
      <div className="text-2xl md:text-3xl font-medium text-white/80">
        {dateInfo.day}, {dateInfo.month}
      </div>
      <div className="mt-2 text-[6rem] md:text-[8rem] font-extrabold leading-none text-white tracking-tighter">
        {dateInfo.date}
      </div>
    </BaseWidget>
  );
};
