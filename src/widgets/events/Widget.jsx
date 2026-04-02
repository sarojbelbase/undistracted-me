import { useState, useEffect } from 'react';
import { PlusLg, CalendarEvent, ArrowRight } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useEvents, useGoogleCalendar } from '../useEvents';
import { todayStr, humanizeAge } from "./utils";
import { CreateModal } from './CreateModal';
import { AllEventsModal } from './AllEventsModal';
import config from './config';
import { EventRow } from '../../components/ui/EventRow';
import { TintedChip } from '../../components/ui/TintedChip';
import { RefreshIcon } from '../../components/ui/RefreshIcon';

export const Widget = ({ onRemove }) => {
  const [localEvents, addEvent, removeEvent] = useEvents();
  const { gcalEvents, loading, connected, syncedAt, refresh } = useGoogleCalendar();
  const events = [...localEvents, ...gcalEvents];
  const [showCreate, setShowCreate] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [ageLabel, setAgeLabel] = useState(() => humanizeAge(syncedAt));
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setAgeLabel(humanizeAge(syncedAt));
    if (!syncedAt) return;
    const tid = setInterval(() => setAgeLabel(humanizeAge(syncedAt)), 30_000);
    return () => clearInterval(tid);
  }, [syncedAt]);

  // Tick every minute so past events disappear in real-time
  useEffect(() => {
    const tid = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(tid);
  }, []);

  const today = todayStr();

  const upcomingEvents = events
    .filter(e => {
      if (!e.startDate) return true;
      // All-day event: keep while the date is still today or future
      if (!e.startTime) return e.startDate >= today;
      // Timed event: keep until end time if available, otherwise until start time
      const cutoff = e.endTime
        ? new Date(`${e.endDate || e.startDate}T${e.endTime}`)
        : new Date(`${e.startDate}T${e.startTime}`);
      return cutoff > now;
    })
    .sort((a, b) => {
      const aKey = `${a.startDate || today}T${a.startTime || '99:99'}`;
      const bKey = `${b.startDate || today}T${b.startTime || '99:99'}`;
      return aKey.localeCompare(bKey);
    });

  const MAX_VISIBLE = 2;
  const visibleEvents = upcomingEvents.slice(0, MAX_VISIBLE);

  const syncLabel = connected && ageLabel ? `${ageLabel}` : null;

  return (
    <>
      <BaseWidget className="p-4 flex flex-col gap-3" onRemove={onRemove}>

        {/* ── Header: title left · meta+refresh+add right ── */}
        <div className="flex items-center gap-2 shrink-0">
          <h3 className="w-heading leading-tight flex-1">{config.label}</h3>

          {/* Meta info: count · sync · inline text refresh */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="text-[11px] font-medium truncate"
              style={{ color: 'var(--w-ink-5)' }}
            >
              {syncLabel}
            </span>
            <button
              onClick={refresh}
              disabled={loading}
              title={connected ? 'Refresh' : 'Connect Google Calendar'}
              aria-label={connected ? 'Refresh' : 'Connect Google Calendar'}
              className="flex items-center leading-none transition-opacity hover:opacity-50 cursor-pointer select-none shrink-0"
              style={{ color: connected ? 'var(--w-ink-5)' : 'var(--w-accent)' }}
            >
              <RefreshIcon spinning={loading} />
            </button>
          </div>

        </div>

        {/* ── Event list / empty state ── */}
        {upcomingEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center py-4">
            <CalendarEvent size={24} style={{ color: 'var(--w-ink-5)', opacity: 0.3 }} />
            <p className="text-[12px] font-semibold" style={{ color: 'var(--w-ink-5)' }}>
              No upcoming events
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {visibleEvents.map(event => (
              <EventRow key={event.id} event={event} onRemove={removeEvent} />
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between shrink-0 pt-0.5">
          <TintedChip size="md" onClick={() => setShowAll(true)} onMouseDown={e => e.stopPropagation()}>
            View All <ArrowRight size={13} />
          </TintedChip>

          <button
            onClick={() => setShowCreate(true)}
            onMouseDown={e => e.stopPropagation()}
            title="New event"
            aria-label="New event"
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-85 cursor-pointer shrink-0"
            style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
          >
            <PlusLg size={22} />
          </button>
        </div>

      </BaseWidget>

      {showCreate && <CreateModal onSave={addEvent} onClose={() => setShowCreate(false)} />}
      {showAll && <AllEventsModal events={upcomingEvents} onClose={() => setShowAll(false)} onAdd={addEvent} onRemove={removeEvent} />}
    </>
  );
};
