import { useState } from 'react';
import { createPortal } from 'react-dom';
import { PlusLg, XLg, Trash3, CalendarEvent } from 'react-bootstrap-icons';
import { formatEventTime } from '../useEvents';
import { bucketLabel, isPast } from './utils';
import { CreateModal } from './CreateModal';

export const AllEventsModal = ({ events, onClose, onAdd, onRemove }) => {
  const [showCreate, setShowCreate] = useState(false);

  const buckets = ['Today', 'Tomorrow', 'Later', 'Past'];
  const grouped = buckets.reduce((acc, b) => { acc[b] = []; return acc; }, {});
  events.forEach(e => {
    const b = bucketLabel(e.startDate);
    if (grouped[b]) grouped[b].push(e);
  });

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
    >
      <div
        className="rounded-2xl shadow-2xl w-80 max-h-[80vh] flex flex-col animate-fade-in"
        style={{ backgroundColor: 'var(--w-surface)', border: '1px solid var(--w-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span className="w-heading">All Events</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreate(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
              aria-label="Add event"
            >
              <PlusLg size={14} />
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{ color: 'var(--w-ink-4)' }}
              aria-label="Close"
            >
              <XLg size={14} />
            </button>
          </div>
        </div>

        {/* Event list */}
        <div className="overflow-y-auto flex-1 px-5 pb-4">
          {buckets.map(b => grouped[b].length > 0 && (
            <div key={b} className="mb-4">
              <div className="w-label mb-2">{b}</div>
              <div style={{ borderTop: '1px solid var(--w-border)' }}>
                {grouped[b].map(event => (
                  <div
                    key={event.id}
                    className="py-2.5 flex items-start gap-2 transition-opacity"
                    style={{
                      borderBottom: '1px solid var(--w-border)',
                      opacity: isPast(event) ? 0.35 : 1,
                    }}
                  >
                    <div
                      className="w-1 rounded-full shrink-0 mt-0.5"
                      style={{ height: '36px', backgroundColor: 'var(--w-accent)' }}
                    />
                    <div className="flex-1 min-w-0">
                      {event.htmlLink ? (
                        <a
                          href={event.htmlLink}
                          target="_blank"
                          rel="noreferrer"
                          className="w-body font-medium truncate block hover:underline"
                          style={{ color: 'inherit' }}
                        >
                          {event.title}
                        </a>
                      ) : (
                        <div className="w-body font-medium truncate">{event.title}</div>
                      )}
                      <div className="w-caption">{formatEventTime(event)}</div>
                    </div>
                    {event._source !== 'gcal' && (
                      <button
                        onClick={() => onRemove(event.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-full transition-colors shrink-0 mt-0.5"
                        style={{ color: 'var(--w-ink-6)' }}
                        aria-label="Remove event"
                      >
                        <Trash3 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarEvent size={32} style={{ color: 'var(--w-ink-6)' }} />
              <p className="w-muted">No events yet.<br />Hit + to create one.</p>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateModal onSave={onAdd} onClose={() => setShowCreate(false)} />}
    </div>,
    document.body
  );
};
