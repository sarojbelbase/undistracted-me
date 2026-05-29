import { useState, useEffect, useMemo, useRef } from 'react';
import { PlusLg, CalendarEvent, ArrowRight } from 'react-bootstrap-icons';

const EventSkeleton = () => (
  <div className="evt-skeleton">
    {[0, 1].map(i => (
      <div key={i} className="flex flex-col gap-1.5 animate-pulse">
        <div className="evt-skeleton__line" style={{ width: i === 0 ? '60%' : '48%', height: '0.75rem' }} />
        <div className="evt-skeleton__line" style={{ width: i === 0 ? '40%' : '32%', height: '0.625rem' }} />
      </div>
    ))}
  </div>
);
import { BaseWidget } from '../BaseWidget';
import { useEvents, useGoogleCalendar } from '../../hooks/useEvents';
import { todayStr } from '../../utilities';
import { useAgeLabel } from '../../hooks/useAgeLabel';
import { onClockTick } from '../../utilities/sharedClock';
import { AddEvent } from './AddEvent';
import { AllEventsModal } from './AllEventsModal';
import config from './config';
import { EventRow } from '../../components/ui/EventRow';
import { TintedChip } from '../../components/ui/TintedChip';
import { RefreshIcon } from '../../assets/svg/RefreshIcon';
import { Settings } from './Settings';
import { TooltipBtn } from '../../components/ui/TooltipBtn';

export const Widget = ({ onRemove }) => {
  const [localEvents, addEvent, removeEvent] = useEvents();
  const { gcalEvents, loading, connected, syncedAt, refresh } = useGoogleCalendar();
  const [showCreate, setShowCreate] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const ageLabel = useAgeLabel(syncedAt);
  const [now, setNow] = useState(() => new Date());
  const lastMinuteRef = useRef(now.getMinutes());

  // Tick every minute so past events disappear in real-time — uses shared clock
  useEffect(() => onClockTick(() => {
    const d = new Date();
    if (d.getMinutes() !== lastMinuteRef.current) {
      lastMinuteRef.current = d.getMinutes();
      setNow(d);
    }
  }), []);

  const today = todayStr();

  const upcomingEvents = useMemo(() => {
    const all = [...localEvents, ...gcalEvents];
    return all
      .filter(e => {
        if (!e.startDate) return true;
        if (!e.startTime) return e.startDate >= today;
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
  }, [localEvents, gcalEvents, now, today]);

  const MAX_VISIBLE = 2;
  const visibleEvents = upcomingEvents.slice(0, MAX_VISIBLE);

  const syncLabel = connected && ageLabel ? ageLabel : null;

  return (
    <>
      <BaseWidget className="p-4 flex flex-col gap-3" onRemove={onRemove} settingsContent={<Settings />} settingsTitle={config.title}>

        {/* ── Header: title left · meta+refresh+add right ── */}
        <div className="flex items-center gap-2 shrink-0">
          <h3 className="w-heading leading-tight flex-1">{config.title}</h3>

          {/* Meta info: sync age · refresh (only when calendar is connected) */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="evt-sync-label">
              {syncLabel}
            </span>
            {connected && (
              <TooltipBtn
                onClick={refresh}
                disabled={loading}
                tooltip="Refresh"
                aria-label="Refresh"
                className="flex items-center leading-none transition-opacity hover:opacity-50 cursor-pointer select-none shrink-0"
                style={{ color: 'var(--w-ink-4)' }}
              >
                <RefreshIcon spinning={loading} />
              </TooltipBtn>
            )}
          </div>

        </div>

        {/* ── Event list / empty state ── */}
        {loading && upcomingEvents.length === 0 ? (
          <EventSkeleton />
        ) : upcomingEvents.length === 0 ? (
          <div className="evt-empty">
            <CalendarEvent size={24} className="evt-empty__icon" />
            <p className="w-muted font-semibold">
              No upcoming events
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3.5">
            {visibleEvents.map(event => (
              <EventRow key={event.id} event={event} onRemove={removeEvent} />
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between shrink-0 pt-0.5">
          {upcomingEvents.length > MAX_VISIBLE ? (
            <TintedChip size="md" onClick={() => setShowAll(true)} onMouseDown={e => e.stopPropagation()}>
              View All <ArrowRight size={13} />
            </TintedChip>
          ) : (
            <div />
          )}

          <TooltipBtn
            onClick={() => setShowCreate(true)}
            onMouseDown={e => e.stopPropagation()}
            tooltip="New event"
            aria-label="New event"
            className="evt-add-btn"
          >
            <PlusLg size={22} />
          </TooltipBtn>
        </div>

      </BaseWidget>

      {showCreate && <AddEvent onSave={addEvent} onClose={() => setShowCreate(false)} />}
      {showAll && <AllEventsModal events={upcomingEvents} onClose={() => setShowAll(false)} onAdd={addEvent} onRemove={removeEvent} />}
    </>
  );
};
