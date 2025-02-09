import React from 'react';
import Widget from '../components/Widget';
import { WidgetProps } from '../types/widgets';

const DateTodayWidget: React.FC<WidgetProps> = () => {
  const today = new Date();
  const month = today.toLocaleString('default', { month: 'short' });
  const day = today.getDate();
  const weekday = today.toLocaleString('default', { weekday: 'short' });

  return (
    <Widget>
      <div className="flex flex-col items-center justify-center h-full">
        <div className="flex justify-between items-center gap-2">
          <span className="text-xl font-bold">{weekday}</span>
          <span className="text-xl font-bold text-gray-600">{month}</span>
        </div>
        <span className="text-9xl font-bold">{day}</span>
      </div>
    </Widget>
  );
};

export default DateTodayWidget;