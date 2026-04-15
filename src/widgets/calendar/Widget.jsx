import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import config from './config';
import { useEvents, useGoogleCalendar } from '../useEvents';
import { WEEK_DAYS, DEFAULTS, buildCalendarData } from './utils';
import { EventRow } from '../../components/ui/EventRow';
import { TintedChip } from '../../components/ui/TintedChip';
import { Popup } from '../../components/ui/Popup';

const TOOLTIP_MARGIN = 10; // min px gap from every viewport edge

// DayTooltip uses the shared Popup component — same two-phase portal positioning
const DayTooltip = React.memo(({ events, anchor }) => (
  <Popup anchor={anchor} className="p-3 gap-2.5 max-w-65">
    {events.map(e => (
      <EventRow key={e.id} event={e} showPrefix={false} showMeet={false} compact />
    ))}
  </Popup>
));

const DayCell = ({ day, isWeekend, isCurrent, eventsForDay }) => {
  const [anchor, setAnchor] = useState(null);
  const ref = useRef(null);
  const hasEvents = !isCurrent && eventsForDay.length > 0;

  const handleMouseEnter = () => {
    if (!hasEvents || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    // Snapshot to a plain object — DOMRect is not stable across renders
    setAnchor({ left: r.left, top: r.top, bottom: r.bottom, width: r.width, height: r.height });
  };

  return (
    <div
      ref={ref}
      className="relative flex flex-col items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setAnchor(null)}
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
      {anchor && (
        <DayTooltip events={eventsForDay} anchor={anchor} />
      )}
    </div>
  );
};

const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9,2 5,7 9,12" />
  </svg>
);

const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="5,2 9,7 5,12" />
  </svg>
);

export const Widget = ({ id = 'calendar', onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULTS);
  const { calendarType } = settings;
  // monthOffset is intentionally local — never persisted; always resets to current month on mount
  const [monthOffset, setMonthOffset] = useState(0);
  const [calendarData, setCalendarData] = useState(() => buildCalendarData(DEFAULTS.calendarType, 0));
  const [localEvents] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  // Memoize to avoid re-creating the merged array on every re-render
  const events = useMemo(() => [...localEvents, ...gcalEvents], [localEvents, gcalEvents]);

  const rebuild = useCallback(() => {
    setCalendarData(buildCalendarData(calendarType, monthOffset));
  }, [calendarType, monthOffset]);

  useEffect(() => {
    rebuild();
    // Auto-refresh hourly only when viewing the current month so the "today" highlight stays correct
    if (monthOffset !== 0) return;
    const timer = setInterval(rebuild, 3_600_000);
    return () => clearInterval(timer);
  }, [rebuild, monthOffset]);

  // Reset to current month whenever calendar type changes
  useEffect(() => { setMonthOffset(0); }, [calendarType]);

  return (
    <BaseWidget className="p-4 flex flex-col" settingsTitle={config.title} settingsContent={<Settings id={id} calendarType={calendarType} onChange={updateSetting} />} onRemove={onRemove}>
      {/* Header: month + year on the left, nav arrows on the right */}
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="w-heading">{calendarData.label}</span>
          {calendarData.sublabel && (
            <span className="w-caption font-medium">{calendarData.sublabel}</span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {monthOffset !== 0 && (
            <TintedChip
              onClick={() => setMonthOffset(0)}
              title={buildCalendarData(calendarType, 0).label}
              aria-label={`Go to current month`}
              size="sm"
            >
              Go To Today
            </TintedChip>
          )}
          <button
            onClick={() => setMonthOffset(o => o - 1)}
            className="p-1 rounded transition-colors group/btn"
            style={{ color: 'var(--w-ink-5)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--w-ink-3)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--w-ink-5)'}
            onMouseDown={e => e.currentTarget.style.color = 'var(--w-ink-3)'}
            onMouseUp={e => e.currentTarget.style.color = 'var(--w-ink-3)'}
            aria-label="Previous month"
          >
            <ChevronLeft />
          </button>
          <button
            onClick={() => setMonthOffset(o => o + 1)}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--w-ink-5)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--w-ink-3)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--w-ink-5)'}
            onMouseDown={e => e.currentTarget.style.color = 'var(--w-ink-3)'}
            onMouseUp={e => e.currentTarget.style.color = 'var(--w-ink-3)'}
            aria-label="Next month"
          >
            <ChevronRight />
          </button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-x-1 gap-y-0.5 text-center text-sm flex-1 content-start">
        {WEEK_DAYS.map((day) => (
          <div key={day} className="w-label pb-1">{day}</div>
        ))}
        {calendarData.days.map((day, index) => {
          const col = index % 7;
          const isWeekend = col === 0 || col === 6;
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
