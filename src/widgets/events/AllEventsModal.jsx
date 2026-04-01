import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlusLg, XLg, Trash3, CalendarEvent } from 'react-bootstrap-icons';
import { bucketLabel, isPast, fmt12, calcDuration } from './utils';
import { CreateModal } from './CreateModal';

export const AllEventsModal = ({ events, onClose, onAdd, onRemove }) => {
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const buckets = ['Today', 'Tomorrow', 'Later'];
  const grouped = buckets.reduce((acc, b) => { acc[b] = []; return acc; }, {});
  events.forEach(e => {
    const b = bucketLabel(e.startDate);
    if (grouped[b]) grouped[b].push(e);
    // 'Past' bucket is intentionally dropped — this modal only shows upcoming
  });

  const hasAny = buckets.some(b => grouped[b].length > 0);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[80vh] flex flex-col animate-fade-in"
        style={{ backgroundColor: 'var(--w-surface)', border: '1px solid var(--w-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0"
          style={{ borderBottom: '1px solid var(--w-border)' }}
        >
          <div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--w-ink-1)' }}>All Events</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--w-ink-5)' }}>
              {events.length} upcoming
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-85 cursor-pointer shadow-sm"
              style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
              aria-label="Add event"
            >
              <PlusLg size={14} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity hover:opacity-70 cursor-pointer"
              style={{ background: 'var(--w-surface-2)', color: 'var(--w-ink-4)', border: '1px solid var(--w-border)' }}
              aria-label="Close"
            >
              <XLg size={13} />
            </button>
          </div>
        </div>

        {/* Event list */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6">
          {!hasAny && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <CalendarEvent size={32} style={{ color: 'var(--w-ink-5)', opacity: 0.35 }} />
              <p className="text-[12px] font-semibold" style={{ color: 'var(--w-ink-5)' }}>
                No upcoming events.<br />Hit + to create one.
              </p>
            </div>
          )}

          {buckets.map(b => grouped[b].length > 0 && (
            <div key={b}>
              {/* Bucket heading */}
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: 'var(--w-ink-5)', letterSpacing: '0.1em' }}
              >{b}</p>

              <div className="flex flex-col gap-4">
                {grouped[b].map(event => {
                  const startLabel = fmt12(event.startTime);
                  const duration = calcDuration(event.startTime, event.endTime, event.startDate, event.endDate);
                  const meetLink = event.meetLink || null;
                  const metaParts = [];
                  if (startLabel) metaParts.push(startLabel);
                  if (duration) metaParts.push(duration);

                  return (
                    <div
                      key={event.id}
                      className="flex items-stretch gap-3 group"
                      style={{ opacity: isPast(event) ? 0.4 : 1 }}
                    >
                      {/* 3 px bar */}
                      <div
                        className="w-[5px] rounded-[2px] shrink-0 self-stretch"
                        style={{ backgroundColor: 'var(--w-accent)', minHeight: '40px' }}
                      />

                      <div className="flex-1 min-w-0 flex flex-col gap-1">

                        {/* Title + actions */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {event.htmlLink
                              ? <a
                                href={event.htmlLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[13px] font-semibold leading-snug hover:underline block"
                                style={{ color: 'var(--w-ink-1)' }}
                              >{event.title}</a>
                              : <p className="text-[13px] font-semibold leading-snug" style={{ color: 'var(--w-ink-1)' }}>
                                {event.title}
                              </p>
                            }
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {meetLink && (
                              <a
                                href={meetLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap transition-opacity hover:opacity-80"
                                style={{
                                  background: 'color-mix(in srgb, var(--w-accent) 8%, transparent)',
                                  color: 'var(--w-accent)',
                                }}
                              >Go to Meet</a>
                            )}
                            {event._source !== 'gcal' && (
                              <button
                                onClick={() => onRemove(event.id)}
                                className="w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 shrink-0 cursor-pointer"
                                style={{ color: 'var(--w-ink-5)' }}
                                aria-label="Remove"
                              >
                                <Trash3 size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Meta: time · duration */}
                        {metaParts.length > 0 && (
                          <p className="text-[11px] font-semibold" style={{ color: 'var(--w-ink-5)' }}>
                            {metaParts.join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && <CreateModal onSave={onAdd} onClose={() => setShowCreate(false)} />}
    </div>,
    document.body
  );
};
