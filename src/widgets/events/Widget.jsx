import { useState, useEffect } from 'react';
import { PlusLg, CalendarEvent, Trash3, ArrowRepeat, ChevronRight, ArrowBarRight, ArrowRight, ArrowClockwise } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useEvents, useGoogleCalendar } from '../useEvents';
import { todayStr, humanizeAge, fmt12, calcDuration, datePrefixFor } from "./utils";
import { CreateModal } from './CreateModal';
import { AllEventsModal } from './AllEventsModal';
import config from './config';

export const Widget = ({ onRemove }) => {
  const [localEvents, addEvent, removeEvent] = useEvents();
  const { gcalEvents, loading, connected, syncedAt, refresh } = useGoogleCalendar();
  const events = [...localEvents, ...gcalEvents];
  const [showCreate, setShowCreate] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [ageLabel, setAgeLabel] = useState(() => humanizeAge(syncedAt));

  useEffect(() => {
    setAgeLabel(humanizeAge(syncedAt));
    if (!syncedAt) return;
    const tid = setInterval(() => setAgeLabel(humanizeAge(syncedAt)), 30_000);
    return () => clearInterval(tid);
  }, [syncedAt]);

  const today = todayStr();

  const upcomingEvents = events
    .filter(e => !e.startDate || e.startDate >= today)
    .sort((a, b) => {
      const aKey = `${a.startDate || today}T${a.startTime || '99:99'}`;
      const bKey = `${b.startDate || today}T${b.startTime || '99:99'}`;
      return aKey.localeCompare(bKey);
    });

  const MAX_VISIBLE = 2;
  const visibleEvents = upcomingEvents.slice(0, MAX_VISIBLE);
  const hasMore = upcomingEvents.length > MAX_VISIBLE;

  const syncLabel = connected && ageLabel ? `${ageLabel}` : null;
  const countLabel = upcomingEvents.length > 0 ? `${upcomingEvents.length} Upcoming` : 'Nothing';

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
              {countLabel}{syncLabel ? ` · ${syncLabel}` : ''}
            </span>
            <button
              onClick={refresh}
              disabled={loading}
              title={connected ? 'Refresh' : 'Connect Google Calendar'}
              aria-label={connected ? 'Refresh' : 'Connect Google Calendar'}
              className="flex items-center leading-none transition-opacity hover:opacity-50 cursor-pointer select-none shrink-0"
              style={{ color: connected ? 'var(--w-ink-5)' : 'var(--w-accent)' }}
            >
              {loading ? '···' : connected ? <ArrowClockwise size={13} className="animate-none" /> : 'Connect'}
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
            {visibleEvents.map(event => {
              const startLabel = fmt12(event.startTime);
              const duration = calcDuration(event.startTime, event.endTime, event.startDate, event.endDate);
              const prefix = datePrefixFor(event.startDate);
              const meetLink = event.meetLink || null;

              const metaParts = [];
              if (prefix) metaParts.push({ text: prefix, accent: true });
              if (startLabel) metaParts.push({ text: startLabel });
              if (duration) metaParts.push({ text: duration });

              return (
                <div key={event.id} className="flex items-stretch gap-3 group">

                  {/* 3 px accent bar */}
                  <div
                    className="w-[5px] rounded-[2px] shrink-0 self-stretch"
                    style={{ backgroundColor: 'var(--w-accent)', minHeight: '38px' }}
                  />

                  <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">

                    {/* Title row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {event.htmlLink
                          ? <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[13px] font-semibold leading-snug hover:opacity-80 block transition-opacity"
                            style={{ color: 'var(--w-accent)' }}
                          >{event.title}</a>
                          : <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--w-ink-1)' }}>
                            {event.title}
                          </p>
                        }
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        {/* Go to Meet — accent-tinted rectangle */}
                        {meetLink && (
                          <a
                            href={meetLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap transition-opacity hover:opacity-80"
                            style={{
                              background: 'color-mix(in srgb, var(--w-accent) 8%, transparent)',
                              color: 'var(--w-accent)'
                            }}
                          >Go to Meet</a>
                        )}
                        {/* Hover-delete for local events */}
                        {event._source !== 'gcal' && (
                          <button
                            onClick={() => removeEvent(event.id)}
                            className="w-5 h-5 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 shrink-0 cursor-pointer"
                            style={{ color: 'var(--w-ink-5)' }}
                            aria-label={`Remove ${event.title}`}
                          >
                            <Trash3 size={10} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Meta: prefix · start · duration */}
                    {metaParts.length > 0 && (
                      <div className="flex items-center gap-1">
                        {metaParts.flatMap((part, i) => [
                          i > 0 ? <span key={`d${i}`} className="text-[11px] font-semibold select-none" style={{ color: 'var(--w-ink-6)' }}>·</span> : null,
                          <span
                            key={`p${i}`}
                            className="text-[11px] font-semibold"
                            style={{
                              color: part.accent
                                ? 'color-mix(in srgb, var(--w-accent) 65%, var(--w-ink-3))'
                                : 'var(--w-ink-5)'
                            }}
                          >{part.text}</span>,
                        ]).filter(Boolean)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between shrink-0 pt-0.5">
          <button
            onClick={() => setShowAll(true)}
            onMouseDown={e => e.stopPropagation()}
            className="h-8 flex items-center gap-1 text-[13px] font-semibold text-left transition-opacity hover:opacity-80 cursor-pointer px-3 rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--w-accent) 8%, transparent)',
              color: 'var(--w-accent)',
            }}
          >
            View All <ArrowRight size={19} />
          </button>

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
