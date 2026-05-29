import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import config from './config';
import { useEvents, useGoogleCalendar } from '../../hooks/useEvents';
import { WEEK_DAYS, DEFAULTS, buildCalendarData } from './utils';
import { EventRow } from '../../components/ui/EventRow';
import { TintedChip } from '../../components/ui/TintedChip';
import { Popup } from '../../components/ui/Popup';
import { ChevronLeftIcon } from '../../assets/svg/ChevronLeftIcon';
import { ChevronRightIcon } from '../../assets/svg/ChevronRightIcon';
import { CANVAS_HOVER_OVERLAY } from '../../theme/canvas';
import { TooltipBtn } from '../../components/ui/TooltipBtn';
import { AddEvent } from '../events/AddEvent';

const TOOLTIP_MARGIN = 10; // min px gap from every viewport edge

// DayTooltip uses the shared Popup component — same two-phase portal positioning
const DayTooltip = React.memo(({ events, anchor }) => (
  <Popup anchor={anchor} className="p-3 gap-2.5 max-w-65">
    {events.map(e => (
      <EventRow key={e.id} event={e} showPrefix={false} showMeet={false} compact />
    ))}
  </Popup>
));

// Small tooltip shown when hovering the + add button
const AddTooltip = ({ anchor }) => (
  <Popup anchor={anchor} preferAbove className="px-2.5 py-1.5">
    <span style={{ fontSize: '11px', color: 'var(--w-ink-2)', whiteSpace: 'nowrap' }}>Add new event</span>
  </Popup>
);

const DayCell = ({ day, isWeekend, isCurrent, eventsForDay, dateStr, onAddEvent }) => {
  const [anchor, setAnchor] = useState(null);
  const [hoverRect, setHoverRect] = useState(null);
  const [hovered, setHovered] = useState(false);
  const ref = useRef(null);
  const hasEvents = !isCurrent && eventsForDay.length > 0;

  const handleMouseEnter = () => {
    setHovered(true);
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const rect = { left: r.left, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    setHoverRect(rect);
    if (hasEvents) setAnchor(rect);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setAnchor(null);
    setHoverRect(null);
  };

  const handleClick = () => {
    if (day && dateStr && onAddEvent) onAddEvent(dateStr);
  };

  if (!day) return <div className="w-7 h-7" />;

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`cal-day-cell${isCurrent ? ' cal-day-cell--today' : isWeekend ? ' cal-day-cell--weekend' : ' cal-day-cell--weekday'}`}
        style={isCurrent ? undefined : { backgroundColor: hovered ? CANVAS_HOVER_OVERLAY : undefined }}
        aria-label={`Add event on ${dateStr}`}
      >
        <span className="cal-day-cell__number" style={{ opacity: hovered ? 0 : 1 }}>
          {day}
        </span>

        <span
          aria-hidden="true"
          className="cal-day-cell__plus"
          style={{ color: isCurrent ? 'var(--w-accent-fg)' : 'var(--w-accent)' }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4.5 1v7M1 4.5h7" />
          </svg>
        </span>

        {hasEvents && (
          <span
            aria-hidden="true"
            className="cal-day-cell__dot"
            style={{
              backgroundColor: isCurrent ? 'var(--w-accent-fg)' : 'var(--w-accent)',
              opacity: hovered ? 0 : 1,
            }}
          />
        )}
      </button>
      {hovered && hoverRect && <AddTooltip anchor={hoverRect} />}
      {anchor && (
        <DayTooltip events={eventsForDay} anchor={anchor} />
      )}
    </>
  );
};

const ChevronLeft = () => <ChevronLeftIcon />;
const ChevronRight = () => <ChevronRightIcon />;

export const Widget = ({ id = 'calendar', onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULTS);
  const { calendarType } = settings;
  // monthOffset is intentionally local — never persisted; always resets to current month on mount
  const [monthOffset, setMonthOffset] = useState(0);
  const [calendarData, setCalendarData] = useState(() => buildCalendarData(DEFAULTS.calendarType, 0));
  const [localEvents, addEvent] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  // Memoize to avoid re-creating the merged array on every re-render
  const events = useMemo(() => [...localEvents, ...gcalEvents], [localEvents, gcalEvents]);
  const [createDate, setCreateDate] = useState(null);

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
    <>
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
            <TooltipBtn
              onClick={() => setMonthOffset(o => o - 1)}
              tooltip="Previous month"
              className="cal-nav-btn"
              aria-label="Previous month"
            >
              <ChevronLeft />
            </TooltipBtn>
            <TooltipBtn
              onClick={() => setMonthOffset(o => o + 1)}
              tooltip="Next month"
              className="cal-nav-btn"
              aria-label="Next month"
            >
              <ChevronRight />
            </TooltipBtn>
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
                key={dateStr ?? `empty-${index}`}
                day={day.date}
                isCurrent={day.isCurrent}
                isWeekend={isWeekend}
                eventsForDay={eventsForDay}
                dateStr={dateStr}
                onAddEvent={setCreateDate}
              />
            );
          })}
        </div>
      </BaseWidget>
      {createDate && (
        <AddEvent
          initialDate={createDate}
          onSave={addEvent}
          onClose={() => setCreateDate(null)}
        />
      )}
    </>
  );
};
