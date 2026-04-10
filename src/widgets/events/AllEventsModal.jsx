import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlusLg, XLg, CalendarEvent } from 'react-bootstrap-icons';
import { bucketLabel, isPast } from './utils';
import { CreateModal } from './CreateModal';
import { EventRow } from '../../components/ui/EventRow';

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
        style={{ background: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)', border: '1px solid var(--card-border)', boxShadow: 'var(--card-shadow)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0"
          style={{ borderBottom: '1px solid var(--card-border)' }}
        >
          <div>
            <p className="text-[15px] font-semibold" style={{ color: 'var(--w-ink-1)' }}>All Events</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: 'var(--w-ink-4)' }}>
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
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors btn-close cursor-pointer"
              style={{ background: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', color: 'var(--w-ink-3)', border: '1px solid var(--card-border)' }}
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
              <CalendarEvent size={32} style={{ color: 'var(--w-ink-4)', opacity: 0.5 }} />
              <p className="text-[12px] font-semibold" style={{ color: 'var(--w-ink-4)' }}>
                No upcoming events.<br />Hit + to create one.
              </p>
            </div>
          )}

          {buckets.map(b => grouped[b].length > 0 && (
            <div key={b}>
              {/* Bucket heading */}
              <p
                className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: 'var(--w-ink-4)', letterSpacing: '0.1em' }}
              >{b}</p>

              <div className="flex flex-col gap-4">
                {grouped[b].map(event => {
                  return (
                    <div
                      key={event.id}
                      style={{ opacity: isPast(event) ? 0.4 : 1 }}
                    >
                      <EventRow event={event} onRemove={onRemove} showPrefix={false} />
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
