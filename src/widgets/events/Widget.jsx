import { useState, useEffect, useMemo } from 'react';
import { PlusLg, CalendarEvent, ArrowRight } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useEvents, useGoogleCalendar } from '../useEvents';
import { todayStr } from '../../utilities';
import { humanizeAge } from "./utils";
import { AddEvent } from './AddEvent';
import { AllEventsModal } from './AllEventsModal';
import config from './config';
import { EventRow } from '../../components/ui/EventRow';
import { TintedChip } from '../../components/ui/TintedChip';
import { RefreshIcon } from '../../components/ui/RefreshIcon';
import { Settings } from './Settings';
import { TooltipBtn } from '../../components/ui/TooltipBtn';

export const Widget = ({ onRemove }) => {
  const [localEvents, addEvent, removeEvent] = useEvents();
  const { gcalEvents, loading, connected, syncedAt, refresh } = useGoogleCalendar();
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
            <span
              className="text-[11px] font-medium truncate"
              style={{ color: 'var(--w-ink-4)' }}
            >
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
        {upcomingEvents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <CalendarEvent size={24} style={{ color: 'var(--w-ink-4)', opacity: 0.5 }} />
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
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-85 cursor-pointer shrink-0"
            style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
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
