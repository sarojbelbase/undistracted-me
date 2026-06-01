import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import config from './config';
import { useEvents, useGoogleCalendar } from '../../hooks/useEvents';
import { WEEK_DAYS, DEFAULTS, buildCalendarData } from './utils';
import { EventRow } from '../../components/ui/EventRow';
import { Popup } from '../../components/ui/Popup';
import { ChevronLeftIcon } from '../../assets/svg/ChevronLeftIcon';
import { ChevronRightIcon } from '../../assets/svg/ChevronRightIcon';
import { CANVAS_HOVER_OVERLAY } from '../../theme/canvas';
import { TooltipBtn } from '../../components/ui/TooltipBtn';
import { AddEvent } from '../events/AddEvent';

// ── Tooltips ─────────────────────────────────────────────────────────────────

const DayTooltip = React.memo(({ events, anchor }) => (
  <Popup anchor={anchor} className="p-3 gap-2.5 max-w-65">
    {events.map(e => (
      <EventRow key={e.id} event={e} showPrefix={false} showMeet={false} compact />
    ))}
  </Popup>
));

const AddTooltip = ({ anchor }) => (
  <Popup anchor={anchor} preferAbove className="px-2.5 py-1.5">
    <span style={{ fontSize: '11px', color: 'var(--w-ink-2)', whiteSpace: 'nowrap' }}>Add new event</span>
  </Popup>
);

// ── Day Cell ─────────────────────────────────────────────────────────────────

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

  if (!day) return <div className="cal-day-cell--empty" />;

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
      {anchor && <DayTooltip events={eventsForDay} anchor={anchor} />}
    </>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const ChevronLeft = () => <ChevronLeftIcon />;
const ChevronRight = () => <ChevronRightIcon />;

/** Pad an array of day objects to exactly `len` items with empty slots. */
const padDays = (days, len = 7) => {
  const out = days.slice(0, len);
  while (out.length < len) out.push({ date: null, isCurrent: false });
  return out;
};

/** Build a date string for a day object given calendar context. */
const dayDateStr = (day, calendarData) => {
  if (!day || day.date == null) return null;
  if (day.adDate) return day.adDate;
  return `${String(calendarData.year).padStart(4, '0')}-${String(calendarData.month).padStart(2, '0')}-${String(day.date).padStart(2, '0')}`;
};

// ── Widget ───────────────────────────────────────────────────────────────────

export const Widget = ({ id = 'calendar', onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, DEFAULTS);
  const { calendarType } = settings;

  // monthOffset: which month relative to today (0 = current)
  const [monthOffset, setMonthOffset] = useState(0);
  // startWeek: which week index within calendarData.days is the top row
  const [startWeek, setStartWeek] = useState(0);

  const [calendarData, setCalendarData] = useState(() => buildCalendarData(DEFAULTS.calendarType, 0));
  const [localEvents, addEvent] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  const events = useMemo(() => [...localEvents, ...gcalEvents], [localEvents, gcalEvents]);
  const [createDate, setCreateDate] = useState(null);

  // ── Rebuild calendar data when month changes ───────────────────────────────
  const rebuild = useCallback(() => {
    setCalendarData(buildCalendarData(calendarType, monthOffset));
  }, [calendarType, monthOffset]);

  useEffect(() => {
    rebuild();
    if (monthOffset !== 0) return;
    const timer = setInterval(rebuild, 3_600_000);
    return () => clearInterval(timer);
  }, [rebuild, monthOffset]);

  useEffect(() => { setMonthOffset(0); }, [calendarType]);

  // ── Compute week geometry ──────────────────────────────────────────────────
  const totalWeeks = Math.ceil(calendarData.days.length / 7);

  // When data loads for the current month, anchor startWeek so today is visible
  useEffect(() => {
    if (monthOffset !== 0) return;
    const todayIdx = calendarData.days.findIndex(d => d.isCurrent);
    if (todayIdx < 0) return;
    const todayWeek = Math.floor(todayIdx / 7);
    // Show today's week as the first row, unless it's the very last week
    // (then show second-to-last week as first row so today is in row 2)
    const initial = todayWeek < totalWeeks - 1 ? todayWeek : Math.max(0, todayWeek - 1);
    setStartWeek(initial);
  }, [calendarData, monthOffset, totalWeeks]);

  // Clamp startWeek when totalWeeks changes (e.g. after month transition)
  useEffect(() => {
    if (totalWeeks > 0 && startWeek >= totalWeeks) {
      setStartWeek(Math.max(0, totalWeeks - 2));
    }
  }, [totalWeeks, startWeek]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goPrev = () => {
    setStartWeek(prev => {
      if (prev > 0) return prev - 1;
      // Cross into previous month
      setMonthOffset(m => m - 1);
      return 0; // temporary — will be clamped when new data loads
    });
  };

  const goNext = () => {
    setStartWeek(prev => {
      if (prev + 2 < totalWeeks) return prev + 1;
      // Cross into next month
      setMonthOffset(m => m + 1);
      return 0;
    });
  };

  const goToday = () => {
    setMonthOffset(0);
    // startWeek will be set by the useEffect above when data reloads
  };

  // ── Are we viewing the "current" fortnight? ─────────────────────────────────
  const viewingToday = monthOffset === 0 && (() => {
    const todayIdx = calendarData.days.findIndex(d => d.isCurrent);
    if (todayIdx < 0) return false;
    const todayWeek = Math.floor(todayIdx / 7);
    return todayWeek === startWeek || todayWeek === startWeek + 1;
  })();

  // ── Slice two weeks ────────────────────────────────────────────────────────
  const week1 = padDays(calendarData.days.slice(startWeek * 7, startWeek * 7 + 7));
  const week2 = padDays(calendarData.days.slice((startWeek + 1) * 7, (startWeek + 1) * 7 + 7));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <BaseWidget
        className="p-4 flex flex-col gap-2.5"
        settingsTitle={config.title}
        settingsContent={<Settings id={id} calendarType={calendarType} onChange={updateSetting} />}
        onRemove={onRemove}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="w-heading">{calendarData.label}</span>
            {calendarData.sublabel && (
              <span className="w-caption font-medium">{calendarData.sublabel}</span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {!viewingToday && (
              <button
                onClick={goToday}
                className="cal-today-btn"
                aria-label="Go to current fortnight"
              >
                Today
              </button>
            )}
            <TooltipBtn
              onClick={goPrev}
              tooltip="Previous week"
              className="cal-nav-btn"
              aria-label="Previous week"
            >
              <ChevronLeft />
            </TooltipBtn>
            <TooltipBtn
              onClick={goNext}
              tooltip="Next week"
              className="cal-nav-btn"
              aria-label="Next week"
            >
              <ChevronRight />
            </TooltipBtn>
          </div>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 gap-x-1 text-center">
          {WEEK_DAYS.map(d => (
            <div key={d} className="cal-weekday-header">{d}</div>
          ))}
        </div>

        {/* Week row 1 */}
        <div className="grid grid-cols-7 gap-x-1 text-center cal-week-row">
          {week1.map((day, i) => {
            const isWeekend = i === 0 || i === 6;
            const dateStr = dayDateStr(day, calendarData);
            const eventsForDay = dateStr ? events.filter(e => e.startDate === dateStr) : [];
            return (
              <DayCell
                key={dateStr ?? `w1-empty-${i}`}
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

        {/* Week row 2 */}
        <div className="grid grid-cols-7 gap-x-1 text-center cal-week-row cal-week-row--secondary">
          {week2.map((day, i) => {
            const isWeekend = i === 0 || i === 6;
            const dateStr = dayDateStr(day, calendarData);
            const eventsForDay = dateStr ? events.filter(e => e.startDate === dateStr) : [];
            return (
              <DayCell
                key={dateStr ?? `w2-empty-${i}`}
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
