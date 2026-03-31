import { useState } from 'react';
import { PlusLg, ArrowRight, CalendarEvent, Trash3 } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useEvents, useGoogleCalendar, formatEventTime } from '../useEvents';
import { todayStr, isPast, HEADER_H, FOOTER_H, bucketLabel } from "./utils";
import { CreateModal } from './CreateModal';
import { AllEventsModal } from './AllEventsModal';

export const Widget = ({ onRemove }) => {
  const [localEvents, addEvent, removeEvent] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  const events = [...localEvents, ...gcalEvents];
  const [showCreate, setShowCreate] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const today = todayStr();

  // All upcoming events (today + future) sorted chronologically
  const upcomingEvents = events
    .filter(e => !e.startDate || e.startDate >= today)
    .sort((a, b) => {
      const aKey = `${a.startDate || today}T${a.startTime || '99:99'}`;
      const bKey = `${b.startDate || today}T${b.startTime || '99:99'}`;
      return aKey.localeCompare(bKey);
    });

  const todayCount = upcomingEvents.filter(e => !e.startDate || e.startDate === today).length;
  const hasAnyEvents = events.length > 0;

  // Build a flat list of group headers + events for rendering
  const rows = [];
  let lastGroup = null;
  upcomingEvents.forEach(event => {
    const group = bucketLabel(event.startDate);
    if (group !== lastGroup) {
      rows.push({ _type: 'header', label: group, key: `hdr-${group}` });
      lastGroup = group;
    }
    rows.push({ _type: 'event', ...event });
  });

  return (
    <>
      <BaseWidget className="p-4 flex flex-col" onRemove={onRemove}>
        {/* Header */}
        <div className="flex justify-between items-baseline shrink-0" style={{ height: HEADER_H }}>
          <h3 className="w-heading">Today</h3>
          <div className="flex items-baseline gap-1">
            <span className="w-title-bold">{todayCount}</span>
            <span className="w-title-soft">Events</span>
          </div>
        </div>

        {/* Event list or empty state */}
        {upcomingEvents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <CalendarEvent size={28} className="text-gray-200" />
            <p className="w-muted">No events today.<br />Press + to add one.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {rows.map(row => {
              if (row._type === 'header') {
                // Skip Today header — the widget title already says "Today"
                if (row.label === 'Today') return null;
                return (
                  <div key={row.key} className="flex items-center gap-2 py-1.5 mt-1">
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--w-border)' }} />
                    <span className="w-label" style={{ fontSize: '10px' }}>{row.label}</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--w-border)' }} />
                  </div>
                );
              }
              const event = row;
              return (
                <div
                  key={event.id}
                  className="py-3 flex items-start transition-opacity"
                  style={{
                    borderBottom: '1px solid var(--w-border)',
                    opacity: isPast(event) ? 0.3 : 1,
                  }}
                >
                  <div className="w-1 rounded-full mr-3 mt-0.5 shrink-0" style={{ height: '36px', backgroundColor: 'var(--w-accent)' }} />
                  <div className="flex-1 min-w-0">
                    {event.htmlLink
                      ? <a href={event.htmlLink} target="_blank" rel="noreferrer" className="w-body font-medium truncate block hover:underline" style={{ color: 'inherit' }}>{event.title}</a>
                      : <div className="w-body font-medium truncate">{event.title}</div>
                    }
                    <div className="w-caption mt-0.5">{formatEventTime(event)}</div>
                  </div>
                  {event._source !== 'gcal' && (
                    <button onClick={() => removeEvent(event.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0">
                      <Trash3 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer: view-all left, plus right */}
        <div className="flex justify-between items-center shrink-0 pt-1" style={{ height: FOOTER_H }}>
          <div>
            {hasAnyEvents && (
              <button
                onClick={() => setShowAll(true)}
                onMouseDown={e => e.stopPropagation()}
                className="h-8 px-3 rounded-full flex items-center gap-1.5 transition-colors"
                style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
              >
                <span className="text-xs font-medium">View all</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            onMouseDown={e => e.stopPropagation()}
            className="w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-colors"
            style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
          >
            <PlusLg size={18} />
          </button>
        </div>
      </BaseWidget>

      {showCreate && <CreateModal onSave={addEvent} onClose={() => setShowCreate(false)} />}
      {showAll && <AllEventsModal events={events} onClose={() => setShowAll(false)} onAdd={addEvent} onRemove={removeEvent} />}
    </>
  );
};
