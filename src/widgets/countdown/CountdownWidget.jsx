import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';

export const CountdownWidget = ({ onRemove, showRemove }) => {
  const [countdown, setCountdown] = useState({
    eventName: 'Workout',
    minutes: 19,
    time: '7:30 AM to 8:30 AM'
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => ({
        ...prev,
        minutes: prev.minutes > 0 ? prev.minutes - 1 : 0
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <BaseWidget className="p-6 flex flex-col justify-center" onRemove={onRemove} showRemove={showRemove}>
      <div className="text-xs text-gray-400 tracking-wide">{countdown.time}</div>
      <div className="mt-2 text-xl font-bold text-gray-900 leading-snug">
        {countdown.eventName} is{' '}
        <span className="text-gray-500 font-normal">in</span>{' '}
        <span className="text-3xl font-extrabold text-gray-900">{countdown.minutes} min</span>
      </div>
    </BaseWidget>
  );
};
