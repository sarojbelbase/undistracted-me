import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';

const getTargetTime = () => {
  const t = new Date();
  t.setMinutes(t.getMinutes() + 45);
  return t;
};

const formatTime12h = (date) => {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
};

const getMinutesLeft = (target) => Math.max(0, Math.floor((target - new Date()) / 60_000));

const START = new Date();
const TARGET = getTargetTime();
const EVENT = { name: 'Reading Books', start: START, target: TARGET };

export const Widget = () => {
  const [minutes, setMinutes] = useState(() => getMinutesLeft(EVENT.target));

  useEffect(() => {
    if (!EVENT.target) return;
    const id = setInterval(() => setMinutes(getMinutesLeft(EVENT.target)), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <BaseWidget className="p-4 flex flex-col">
      <div className="flex items-baseline gap-1.5">
        <span className="text-base font-semibold text-gray-400">{formatTime12h(EVENT.start)}</span>
        {EVENT.target && <>
          <span className="text-base font-semibold text-gray-400">to</span>
          <span className="text-base font-bold text-gray-700">{formatTime12h(EVENT.target)}</span>
        </>}
      </div>
      <div className="flex-1 flex flex-col items-start justify-center min-w-0">
        <div className="w-full text-xl font-bold text-gray-900 leading-snug">
          <span className="block truncate">{EVENT.name} <span className="font-normal text-gray-500">is</span></span>
          {EVENT.target
            ? <>in <span className="text-4xl font-extrabold text-gray-600">{minutes} min</span></>
            : <span className="text-4xl font-extrabold">now</span>
          }
        </div>
      </div>
    </BaseWidget>
  );
};
