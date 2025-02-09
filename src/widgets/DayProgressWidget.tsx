import React, { useEffect, useState } from 'react';
import Widget from '../components/Widget';
import { WidgetProps } from '../types/widgets';

const DayProgressWidget: React.FC<WidgetProps> = ({ settings }) => {
  const [currentHour, setCurrentHour] = useState(new Date().getHours());
  const [currentMinute, setCurrentMinute] = useState(new Date().getMinutes());

  const {
    mode = 'work',
    startHour = 0,
    endHour = 24,
    dotColorActive = 'bg-accent-2',
    dotColorInactive = 'bg-gray-200'
  } = settings;

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentHour(now.getHours());
      setCurrentMinute(now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const progress = Math.round((currentHour / 24) * 100);

  return (
    <Widget>
      <div className="flex flex-col h-full p-3 space-y-2">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xl font-bold">Day</span>
          <span className="text-xl font-bold text-gray-600">{progress}%</span>
        </div>
        <div className="grid grid-cols-6 grid-rows-4 gap-2">
          {Array.from({ length: 24 }).map((_, index) => (
            <div
              key={`day-progress-hour-${index}`}
              className={`
                w-3.5 h-3.5 rounded-full
                ${index <= currentHour ? dotColorActive : dotColorInactive}
              `}
            />
          ))}
        </div>
      </div>
    </Widget>
  );
};

export default DayProgressWidget;