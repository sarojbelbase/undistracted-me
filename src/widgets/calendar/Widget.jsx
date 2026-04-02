import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import { useEvents, useGoogleCalendar } from '../useEvents';
import { WEEK_DAYS, DEFAULTS, buildCalendarData } from './utils';
import { EventRow } from '../../components/ui/EventRow';

// Tooltip that shows on hover, renders via portal so it escapes widget overflow clipping
const DayCell = ({ day, isWeekend, isCurrent, eventsForDay }) => {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const hasEvents = !isCurrent && eventsForDay.length > 0;

  const handleMouseEnter = () => {
    if (!hasEvents || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    // Flip above if within 160px of the bottom of the viewport
    const spaceBelow = window.innerHeight - r.bottom;
    const showAbove = spaceBelow < 160;
    setPos({
      left: r.left + r.width / 2,
      ...(showAbove ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    });
  };

  return (
    <div
      ref={ref}
      className="relative flex flex-col items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setPos(null)}
    >
      <div
        className={`py-1 text-sm font-semibold leading-6 w-7 h-7 mx-auto flex items-center justify-center rounded-full
          ${isCurrent ? '' : day ? 'hover:bg-gray-100 cursor-default transition-colors' : ''}`}
        style={isCurrent
          ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
          : day ? { color: isWeekend ? 'var(--w-ink-5)' : 'var(--w-ink-4)' } : undefined}
      >
        {day || ''}
      </div>
      {hasEvents && (
        <div className="w-1 h-1 rounded-full mt-0.5" style={{ backgroundColor: 'var(--w-accent)' }} />
      )}
      {pos && createPortal(
        <div
          className="fixed z-[9999] rounded-xl shadow-lg p-3 w-max max-w-[240px] animate-fade-in flex flex-col gap-2.5"
          style={{ ...pos, transform: 'translateX(-50%)', backgroundColor: 'var(--w-surface)', border: '1px solid var(--w-border)', pointerEvents: 'none' }}
        >
          {eventsForDay.map(e => (
            <EventRow key={e.id} event={e} showPrefix={false} showMeet={false} compact />
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

export const Widget = ({ id = 'calendar', onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULTS);
  const { calendarType } = settings;
  const [calendarData, setCalendarData] = useState(() => buildCalendarData(DEFAULTS.calendarType));
  const [localEvents] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  const events = [...localEvents, ...gcalEvents];

  useEffect(() => {
    const update = () => {
      setCalendarData(buildCalendarData(calendarType));
    };

    update();
    const id = setInterval(update, 3_600_000);
    return () => clearInterval(id);
  }, [calendarType]);

  return (
    <BaseWidget className="p-4 flex flex-col" settingsContent={<Settings id={id} calendarType={calendarType} onChange={updateSetting} />} onRemove={onRemove}>
      <div className="flex items-baseline gap-2">
        <span className="w-heading">{calendarData.label}</span>
        {calendarData.sublabel && (
          <span className="w-caption font-medium">{calendarData.sublabel}</span>
        )}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-x-1 gap-y-0.5 text-center text-sm flex-1 content-start">
        {WEEK_DAYS.map((day, i) => (
          <div key={day} className="font-bold pb-1" style={{ color: 'var(--w-ink-3)' }}>{day}</div>
        ))}
        {calendarData.days.map((day, index) => {
          const col = index % 7;
          const isWeekend = col === 0 || col === 6;
          // In BS mode, adDate holds the real AD date string; in AD mode, build it from year/month/day
          const dateStr = day.adDate ?? (day.date
            ? `${String(calendarData.year).padStart(4, '0')}-${String(calendarData.month).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`
            : null);
          const eventsForDay = dateStr
            ? events.filter(e => e.startDate === dateStr)
            : [];
          return (
            <DayCell
              key={index}
              day={day.date}
              isCurrent={day.isCurrent}
              isWeekend={isWeekend}
              eventsForDay={eventsForDay}
            />
          );
        })}
      </div>
    </BaseWidget>
  );
};
