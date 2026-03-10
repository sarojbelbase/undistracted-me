import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlusLg, ArrowRight, CalendarEvent, XLg, Trash3, ClockFill } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useEvents, formatEventTime, todayStr } from '../useEvents';

const ITEM_HEIGHT = 57;
const HEADER_H = 40;
const FOOTER_H = 52;

const bucket = (dateStr) => {
  const today = todayStr();
  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  const tomorrowStr = tom.toISOString().slice(0, 10);
  if (!dateStr || dateStr === today) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';
  if (dateStr > today) return 'Later';
  return 'Past';
};

const getDateOffset = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

const DURATION_PILLS = [
  { label: '30 min', mins: 30 },
  { label: '1 hr', mins: 60 },
  { label: '2 hr', mins: 120 },
  { label: 'Custom', mins: null },
];

const applyDuration = (startDate, startTime, mins) => {
  if (!startDate || !startTime) return { endDate: startDate || '', endTime: '' };
  const d = new Date(`${startDate}T${startTime}`);
  d.setMinutes(d.getMinutes() + mins);
  return {
    endDate: d.toISOString().slice(0, 10),
    endTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
};

const pill = (active) => ({
  className: 'px-3 py-1 text-xs rounded-full border transition-all',
  style: active
    ? { backgroundColor: 'var(--w-ink-1)', color: '#fff', borderColor: 'var(--w-ink-1)' }
    : { backgroundColor: '#fff', color: 'var(--w-ink-4)', borderColor: 'var(--w-ink-6)' },
});

const EMPTY_FORM = { title: '', startDate: '', startTime: '', endDate: '', endTime: '' };

// Date chips: Today / Tomorrow / Custom
const DATE_CHIPS = [
  { label: 'Today', key: 'today', offset: 0 },
  { label: 'Tomorrow', key: 'tomorrow', offset: 1 },
  { label: 'Custom', key: 'custom', offset: null },
];

const CreateModal = ({ onSave, onClose }) => {
  const [form, setForm] = useState({ ...EMPTY_FORM, startDate: todayStr() });
  const [dateChip, setDateChip] = useState('today');
  const [durType, setDurType] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.title.trim() && form.startDate;

  const updateStart = (startDate, startTime) => {
    setForm(f => {
      const next = { ...f, startDate, startTime: startTime ?? f.startTime };
      if (typeof durType === 'number') {
        return { ...next, ...applyDuration(next.startDate, next.startTime, durType) };
      }
      return next;
    });
  };

  const handleDateChip = (chip) => {
    setDateChip(chip.key);
    if (chip.key !== 'custom') {
      updateStart(getDateOffset(chip.offset), form.startTime);
    }
  };

  // datetime-local value for Custom chip
  const datetimeLocalVal = form.startDate && form.startTime
    ? `${form.startDate}T${form.startTime}`
    : form.startDate ? `${form.startDate}T` : '';

  const handleDateTimeLocal = (val) => {
    const [date, time] = val.split('T');
    updateStart(date || '', time || '');
  };

  const handleTimeChange = (val) => {
    updateStart(form.startDate, val);
  };

  const handleDurationPill = (p) => {
    if (p.mins === null) {
      setDurType('custom');
    } else {
      setDurType(p.mins);
      setForm(f => ({ ...f, ...applyDuration(f.startDate, f.startTime, p.mins) }));
    }
  };

  const handleSave = () => {
    if (!valid) return;
    onSave(form);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-80 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="w-heading">New Event</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
            <XLg size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Event name */}
          <input
            autoFocus
            type="text"
            placeholder="What's happening?"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gray-400 transition-colors"
          />

          {/* When block */}
          <div className="rounded-xl border border-gray-100 overflow-hidden" style={{ background: '#f9fafb' }}>
            {/* Date chips */}
            <div className="flex gap-1.5 p-3 pb-2">
              {DATE_CHIPS.map(chip => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => handleDateChip(chip)}
                  {...pill(dateChip === chip.key)}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Time row */}
            <div className="px-3 pb-3">
              {dateChip === 'custom' ? (
                /* Combined date + time — Chrome shows a single native picker */
                <div className="flex flex-col gap-0.5">
                  <span className="w-label mb-1">Date &amp; time</span>
                  <input
                    type="datetime-local"
                    value={datetimeLocalVal}
                    onChange={e => handleDateTimeLocal(e.target.value)}
                    className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
              ) : (
                /* Time-only row when date is implied by chip */
                <div className="flex items-center gap-2">
                  <ClockFill size={11} style={{ color: 'var(--w-ink-5)', flexShrink: 0 }} />
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => handleTimeChange(e.target.value)}
                    placeholder="Add time"
                    className="flex-1 border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <span className="w-label">Duration</span>
            <div className="flex gap-1.5 flex-wrap">
              {DURATION_PILLS.map(p => {
                const active = p.mins === null ? durType === 'custom' : durType === p.mins;
                return (
                  <button key={p.label} type="button" onClick={() => handleDurationPill(p)} {...pill(active)}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom end when duration=custom */}
          {durType === 'custom' && (
            <div className="rounded-xl border border-gray-100 overflow-hidden" style={{ background: '#f9fafb' }}>
              <div className="px-3 pb-3 pt-3">
                <span className="w-label mb-1 block">End date &amp; time</span>
                <input
                  type="datetime-local"
                  value={form.endDate && form.endTime ? `${form.endDate}T${form.endTime}` : ''}
                  onChange={e => {
                    const [d, t] = e.target.value.split('T');
                    setForm(f => ({ ...f, endDate: d || '', endTime: t || '' }));
                  }}
                  className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-gray-400 transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="px-4 py-1.5 text-sm text-white rounded-lg transition-colors disabled:opacity-40"
            style={{ backgroundColor: 'var(--w-ink-1)' }}
          >Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const AllEventsModal = ({ events, onClose, onAdd, onRemove }) => {
  const [showCreate, setShowCreate] = useState(false);
  const buckets = ['Today', 'Tomorrow', 'Later', 'Past'];
  const grouped = buckets.reduce((acc, b) => { acc[b] = []; return acc; }, {});
  events.forEach(e => { const b = bucket(e.startDate); if (grouped[b]) grouped[b].push(e); });

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-80 max-h-[80vh] flex flex-col animate-fade-in">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span className="w-heading">All Events</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreate(true)} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors text-white" style={{ backgroundColor: 'var(--w-ink-2)' }}>
              <PlusLg size={14} />
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">
              <XLg size={14} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 px-5 pb-4">
          {buckets.map(b => grouped[b].length > 0 && (
            <div key={b} className="mb-4">
              <div className="w-label mb-2">{b}</div>
              <div className="divide-y divide-gray-100">
                {grouped[b].map(event => (
                  <div key={event.id} className="py-2.5 flex items-start gap-2">
                    <div className="w-1 rounded-full shrink-0 mt-0.5" style={{ height: '36px', backgroundColor: 'var(--w-ink-1)' }} />
                    <div className="flex-1 min-w-0">
                      <div className="w-body font-medium truncate">{event.title}</div>
                      <div className="w-caption">{formatEventTime(event)}</div>
                    </div>
                    <button onClick={() => onRemove(event.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 mt-0.5">
                      <Trash3 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CalendarEvent size={32} className="text-gray-200" />
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

export const Widget = () => {
  const [events, addEvent, removeEvent] = useEvents();
  const [showCreate, setShowCreate] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const containerRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => {
      const available = entry.contentRect.height - HEADER_H - FOOTER_H;
      setVisibleCount(Math.max(1, Math.floor(available / ITEM_HEIGHT)));
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const today = todayStr();
  const todayEvents = events
    .filter(e => !e.startDate || e.startDate === today)
    .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

  const visible = todayEvents.slice(0, visibleCount);
  const hasMore = todayEvents.length > visibleCount || events.some(e => e.startDate && e.startDate > today);

  return (
    <>
      <BaseWidget className="p-4 flex flex-col" ref={containerRef}>
        {/* Header */}
        <div className="flex justify-between items-baseline shrink-0" style={{ height: HEADER_H }}>
          <h3 className="w-heading">Today</h3>
          <div className="flex items-baseline gap-1">
            <span className="w-title-bold">{todayEvents.length}</span>
            <span className="w-title-soft">Events</span>
          </div>
        </div>

        {/* Event list or empty state */}
        {todayEvents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
            <CalendarEvent size={28} className="text-gray-200" />
            <p className="w-muted">No events today.<br />Press + to add one.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 flex-1 overflow-hidden">
            {visible.map(event => (
              <div key={event.id} className="py-3 flex items-start" style={{ height: ITEM_HEIGHT }}>
                <div className="w-1 rounded-full mr-3 mt-0.5 shrink-0" style={{ height: '36px', backgroundColor: 'var(--w-ink-1)' }} />
                <div className="flex-1 min-w-0">
                  <div className="w-body font-medium truncate">{event.title}</div>
                  <div className="w-caption mt-0.5">{formatEventTime(event)}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer: view-all left, plus right */}
        <div className="flex justify-between items-center shrink-0 pt-1" style={{ height: FOOTER_H }}>
          <div>
            {hasMore && (
              <button
                onClick={() => setShowAll(true)}
                onMouseDown={e => e.stopPropagation()}
                className="h-8 px-3 rounded-full flex items-center gap-1.5 transition-colors"
                style={{ backgroundColor: 'var(--w-ink-2)', color: '#fff' }}
              >
                <span className="text-xs font-medium">View all</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            onMouseDown={e => e.stopPropagation()}
            className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md transition-colors"
            style={{ backgroundColor: 'var(--w-ink-2)' }}
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
