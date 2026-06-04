import { useState } from 'react';
import { PlusLg, XLg, CalendarEvent } from 'react-bootstrap-icons';
import { bucketLabel, isPast } from './utils';
import { AddEvent } from './AddEvent';
import { ListPanel, ListPanelRow } from '../../components/ui/ListPanel';
import { Modal } from '../../components/ui/Modal';
import { fmt12, calcDuration, datePrefixFor, isLiveNow } from './utils';

export const AllEventsModal = ({ events, onClose, onAdd, onRemove }) => {
  const [showCreate, setShowCreate] = useState(false);

  const buckets = ['Today', 'Tomorrow', 'Later'];
  const grouped = buckets.reduce((acc, b) => { acc[b] = []; return acc; }, {});
  events.forEach(e => {
    const b = bucketLabel(e.startDate);
    if (grouped[b]) grouped[b].push(e);
    // 'Past' bucket is intentionally dropped — this modal only shows upcoming
  });

  const hasAny = buckets.some(b => grouped[b].length > 0);

  return (
    <Modal onClose={onClose} className="w-full max-w-120 max-h-[80vh] flex flex-col" ariaLabel="All Events">
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

            <ListPanel
              items={grouped[b]}
              renderItem={(event) => {
                const live = isLiveNow(event);
                const startLabel = fmt12(event.startTime);
                const duration = calcDuration(event.startTime, event.endTime, event.startDate, event.endDate);

                const metaParts = [];
                if (live) {
                  metaParts.push({ text: 'in progress', accent: true });
                  const endLabel = fmt12(event.endTime);
                  if (endLabel) metaParts.push({ text: `ends ${endLabel}` });
                } else {
                  const prefix = datePrefixFor(event.startDate);
                  if (prefix) metaParts.push({ text: prefix, accent: true });
                  if (startLabel) metaParts.push({ text: startLabel });
                  if (duration) metaParts.push({ text: duration });
                }

                return (
                  <ListPanelRow
                    key={event.id}
                    title={event.title}
                    meta={metaParts}
                    onDelete={event._source !== 'gcal' ? () => onRemove(event.id) : undefined}
                    deleteLabel={`Remove ${event.title}`}
                    style={{ opacity: isPast(event) ? 0.4 : 1 }}
                  />
                );
              }}
            />
          </div>
        ))}
      </div>

      {showCreate && <AddEvent onSave={onAdd} onClose={() => setShowCreate(false)} />}
    </Modal>
  );
};