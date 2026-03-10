import React, { useState, useEffect } from 'react';
import { HourglassSplit } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useEvents, eventStartDate, formatEventTime } from '../useEvents';

const fmt12h = (date) => {
  if (!date) return '';
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const getMinutesLeft = (target) => Math.max(0, Math.floor((target - new Date()) / 60_000));

const getNextEvent = (events) => {
  const now = new Date();
  return events
    .map(e => ({ ...e, _start: eventStartDate(e) }))
    .filter(e => e._start && e._start > now)
    .sort((a, b) => a._start - b._start)[0] || null;
};

export const Widget = () => {
  const [events] = useEvents();
  const [minutes, setMinutes] = useState(0);
  const [next, setNext] = useState(null);

  useEffect(() => {
    const tick = () => {
      const n = getNextEvent(events);
      setNext(n);
      setMinutes(n ? getMinutesLeft(n._start) : 0);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [events]);

  return (
    <BaseWidget className="p-4 flex flex-col">
      {next ? (
        <>
          <div className="flex items-baseline gap-1.5">
            <span className="w-title-soft">{fmt12h(next._start)}</span>
            {next.endDate && <>
              <span className="w-title-soft">to</span>
              <span className="w-title-bold">{formatEventTime({ startDate: next.endDate, startTime: next.endTime })}</span>
            </>}
          </div>
          <div className="flex-1 flex flex-col items-start justify-center min-w-0">
            <div className="w-full text-xl font-bold leading-snug" style={{ color: 'var(--w-ink-1)' }}>
              <span className="block truncate">{next.title} <span className="font-normal" style={{ color: 'var(--w-ink-5)' }}>is</span></span>
              {minutes > 0
                ? <>in <span className="text-4xl font-extrabold" style={{ color: 'var(--w-accent)' }}>{minutes} min</span></>
                : <span className="text-4xl font-extrabold" style={{ color: 'var(--w-ink-1)' }}>now</span>
              }
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <HourglassSplit size={28} className="text-gray-200" />
          <p className="w-muted">No upcoming events.<br />Add one in the Events widget.</p>
        </div>
      )}
    </BaseWidget>
  );
};
