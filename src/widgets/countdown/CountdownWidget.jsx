import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';

export const CountdownWidget = ({ onRemove, showRemove }) => {
  const [countdown, setCountdown] = useState({
    eventName: 'Workout',
    minutes: 19,
    time: '7:30 AM to 8:30 AM'
  });

  useEffect(() => {
    // Static countdown for now
    // In future, this will calculate from actual events
    const interval = setInterval(() => {
      setCountdown(prev => ({
        ...prev,
        minutes: prev.minutes > 0 ? prev.minutes - 1 : 0
      }));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <BaseWidget className="h-full w-full p-6 flex flex-col justify-center" onRemove={onRemove} showRemove={showRemove}>
      <div className="text-sm text-white/60 uppercase tracking-widest mb-1">{countdown.time}</div>
      <div className="mt-1 text-2xl font-bold text-white/80 leading-snug">
        {countdown.eventName} is in <br/><span className="text-4xl text-white block mt-1">{countdown.minutes} min</span>
      </div>
    </BaseWidget>
  );
};
