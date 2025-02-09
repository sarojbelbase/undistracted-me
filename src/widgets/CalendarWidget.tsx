import React from 'react';
import Widget from '../components/Widget';
import { WidgetProps } from '../types/widgets';

const CalendarWidget: React.FC<WidgetProps> = () => {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <Widget>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => (
          <div key={i} className="text-sm font-bold text-gray-700 mb-4">{day}</div>
        ))}

        {blanks.map((blank) => (
          <div key={`blank-${blank}`} className="h-6" />
        ))}

        {days.map((day) => (
          <div
            key={day}
            className={`h-7 flex items-center justify-center text-sm font-medium
              ${day === today.getDate() ?
                'bg-accent-2 text-white rounded-full' :
                'text-gray-500'}`}
          >
            {day}
          </div>
        ))}
      </div>
    </Widget>
  );
};

export default CalendarWidget;