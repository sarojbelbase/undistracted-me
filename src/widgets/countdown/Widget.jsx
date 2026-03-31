import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusLg, XLg, Trash3, HourglassSplit, ArrowRepeat, CalendarEvent } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useEvents } from '../useEvents';
import { todayStr } from '../../utilities';
import { PillButton } from '../../components/ui/PillButton';
import { REPEAT_OPTIONS, getNextOccurrence, formatCountdown, formatTargetDate } from './utils';

const STORAGE_KEY = 'countdown_events';
// pinned: { type: 'event', eventId } | { type: 'custom', id } | null
const PINNED_KEY = 'countdown_pinned';

const loadCustom = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};
const saveCustom = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
const loadPinned = () => {
  try { return JSON.parse(localStorage.getItem(PINNED_KEY) || 'null'); }
  catch { return null; }
};
const savePinned = (p) => localStorage.setItem(PINNED_KEY, JSON.stringify(p));

const makeId = () => `cd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Chrome notification helper ─────────────────────────────────────────────
const notifyDone = (title) => {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'COUNTDOWN_DONE', title });
  } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification('Countdown complete!', { body: title, icon: '/favicon/lotus32.png' });
  }
};

// ─── Add custom countdown modal ──────────────────────────────────────────────
const AddModal = ({ onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [repeat, setRepeat] = useState('none');

  const valid = title.trim() && date;

  const handleSave = () => {
    if (!valid) return;
    onSave({ id: makeId(), title: title.trim(), targetDate: date, targetTime: time, repeat });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(3px)' }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-2xl shadow-2xl p-5 w-80 animate-fade-in"
        style={{ backgroundColor: 'var(--w-surface)', border: '1px solid var(--w-border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="font-semibold text-base" style={{ color: 'var(--w-ink-1)' }}>New Countdown</span>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:opacity-70 cursor-pointer" style={{ color: 'var(--w-ink-4)' }}>
            <XLg size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            autoFocus
            type="text"
            placeholder="What are you counting down to?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ border: '1px solid var(--w-border)', backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-1)' }}
          />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--w-ink-4)' }}>Date</div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl px-2.5 py-2 text-xs outline-none"
                style={{ border: '1px solid var(--w-border)', backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-1)' }}
              />
            </div>
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--w-ink-4)' }}>Time (optional)</div>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full rounded-xl px-2.5 py-2 text-xs outline-none"
                style={{ border: '1px solid var(--w-border)', backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-1)' }}
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--w-ink-4)' }}>Repeat</div>
            <div className="flex gap-1.5 flex-wrap">
              {REPEAT_OPTIONS.map(r => (
                <PillButton key={r.value} active={repeat === r.value} onClick={() => setRepeat(r.value)}>
                  {r.label}
                </PillButton>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-1.5 text-sm hover:opacity-70 cursor-pointer" style={{ color: 'var(--w-ink-4)' }}>Cancel</button>
          <button onClick={handleSave} disabled={!valid}
            className="px-4 py-1.5 text-sm rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
            style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
          >Save</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Settings panel ───────────────────────────────────────────────────────────
const CountdownSettings = ({ custom, pinned, upcomingEvents, onAddCustom, onRemoveCustom, onPin, onClose }) => {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      {/* Section: Events */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <CalendarEvent size={12} style={{ color: 'var(--w-accent)' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--w-ink-4)' }}>From Events</span>
        </div>
        {upcomingEvents.length === 0 ? (
          <p className="text-xs py-2 px-1" style={{ color: 'var(--w-ink-5)' }}>No upcoming events. Add some in the Events widget.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {upcomingEvents.slice(0, 8).map(ev => {
              const isPinned = pinned?.type === 'event' && pinned?.eventId === ev.id;
              return (
                <button
                  key={ev.id}
                  onClick={() => { onPin({ type: 'event', eventId: ev.id }); onClose?.(); }}
                  className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl transition-all"
                  style={isPinned
                    ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                    : { backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-1)' }
                  }
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{ev.title}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{ev.startDate} {ev.startTime || ''}</div>
                  </div>
                  {isPinned && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 0L6.2 3.8H10L6.9 6.2 8.1 10 5 7.6 1.9 10 3.1 6.2 0 3.8H3.8Z" /></svg>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Section: Custom */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HourglassSplit size={11} style={{ color: 'var(--w-accent)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--w-ink-4)' }}>Custom</span>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
          >
            <PlusLg size={11} />
          </button>
        </div>

        {custom.length === 0 ? (
          <p className="text-xs py-1 px-1" style={{ color: 'var(--w-ink-5)' }}>No custom countdowns.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {custom.map(cd => {
              const next = getNextOccurrence(cd);
              const { days, hours } = formatCountdown(next);
              const isPinned = pinned?.type === 'custom' && pinned?.id === cd.id;
              const isPast = next < new Date() && cd.repeat === 'none';
              return (
                <div
                  key={cd.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={isPinned
                    ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                    : { backgroundColor: 'var(--w-surface-2)', opacity: isPast ? 0.5 : 1 }
                  }
                >
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => { onPin({ type: 'custom', id: cd.id }); onClose?.(); }}
                  >
                    <div className="text-xs font-medium truncate" style={{ color: isPinned ? 'var(--w-accent-fg)' : 'var(--w-ink-1)' }}>{cd.title}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: isPinned ? 'var(--w-accent-fg)' : 'var(--w-ink-4)', opacity: 0.8 }}>
                      {isPast ? 'Past' : days > 0 ? `${days}d` : `${hours}h`} · {formatTargetDate(next)}
                      {cd.repeat !== 'none' && ` · ${cd.repeat}`}
                    </div>
                  </button>
                  <button
                    onClick={() => onRemoveCustom(cd.id)}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:opacity-70 cursor-pointer shrink-0"
                    style={{ color: isPinned ? 'var(--w-accent-fg)' : 'var(--w-ink-5)' }}
                  >
                    <Trash3 size={11} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <AddModal
          onSave={(cd) => { onAddCustom(cd); onPin({ type: 'custom', id: cd.id }); onClose?.(); }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  );
};

// ─── Main Widget ──────────────────────────────────────────────────────────────
export const Widget = ({ onRemove }) => {
  const [custom, setCustom] = useState(loadCustom);
  const [pinned, setPinnedState] = useState(loadPinned);
  const [, setTick] = useState(0);
  const notifiedRef = useRef(new Set());

  const [localEvents] = useEvents();
  const today = todayStr();

  const upcomingEvents = localEvents
    .filter(e => !e.startDate || e.startDate >= today)
    .sort((a, b) => {
      const aKey = `${a.startDate || today}T${a.startTime || '99:99'}`;
      const bKey = `${b.startDate || today}T${b.startTime || '99:99'}`;
      return aKey.localeCompare(bKey);
    });

  const setPin = useCallback((p) => {
    setPinnedState(p);
    savePinned(p);
  }, []);

  const addCustom = useCallback((cd) => {
    setCustom(prev => { const next = [...prev, cd]; saveCustom(next); return next; });
  }, []);

  const removeCustom = useCallback((id) => {
    setCustom(prev => { const next = prev.filter(c => c.id !== id); saveCustom(next); return next; });
    // If the removed countdown was pinned, clear pin
    setPinnedState(p => {
      if (p?.type === 'custom' && p?.id === id) { savePinned(null); return null; }
      return p;
    });
  }, []);

  // Re-render every second for live countdown
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  // ── Resolve target ──
  let target = null; // { title, nextDate, repeat, isPinned }

  if (pinned?.type === 'event') {
    const ev = localEvents.find(e => e.id === pinned.eventId);
    if (ev) {
      const nextDate = new Date(`${ev.startDate}T${ev.startTime || '00:00'}`);
      target = { title: ev.title, nextDate, repeat: 'event', id: ev.id };
    }
  } else if (pinned?.type === 'custom') {
    const cd = custom.find(c => c.id === pinned.id);
    if (cd) {
      target = { title: cd.title, nextDate: getNextOccurrence(cd), repeat: cd.repeat, id: cd.id };
    }
  }

  // Fallback: auto-pick nearest upcoming event
  if (!target && upcomingEvents.length > 0) {
    const ev = upcomingEvents[0];
    const nextDate = new Date(`${ev.startDate}T${ev.startTime || '00:00'}`);
    target = { title: ev.title, nextDate, repeat: 'event', id: ev.id, auto: true };
  }

  // Fallback: auto-pick nearest non-past custom countdown
  if (!target && custom.length > 0) {
    const sorted = custom
      .map(cd => ({ ...cd, _next: getNextOccurrence(cd) }))
      .filter(cd => cd._next > new Date() || cd.repeat !== 'none')
      .sort((a, b) => a._next - b._next);
    if (sorted.length > 0) {
      const cd = sorted[0];
      target = { title: cd.title, nextDate: cd._next, repeat: cd.repeat, id: cd.id, auto: true };
    }
  }

  // ── Notification + auto-reset logic ──
  useEffect(() => {
    if (!target) return;
    const { days, hours, minutes, totalSeconds } = formatCountdown(target.nextDate);
    const done = totalSeconds === 0;
    if (done && !notifiedRef.current.has(target.id ?? target.title)) {
      notifiedRef.current.add(target.id ?? target.title);
      notifyDone(target.title);
      // If pinned custom once-countdown is done, clear pin so we fall back to events
      if (pinned?.type === 'custom') {
        const cd = custom.find(c => c.id === pinned.id);
        if (cd?.repeat === 'none') {
          setTimeout(() => setPin(null), 3_000);
        }
      }
    }
  });

  const { days = 0, hours = 0, minutes: mins = 0, totalSeconds = 0 } = target ? formatCountdown(target.nextDate) : {};
  const done = target && totalSeconds === 0;

  const settingsContent = (onClose) => (
    <CountdownSettings
      custom={custom}
      pinned={pinned}
      upcomingEvents={upcomingEvents}
      onAddCustom={addCustom}
      onRemoveCustom={removeCustom}
      onPin={setPin}
      onClose={onClose}
    />
  );

  return (
    <BaseWidget className="p-4 flex flex-col" settingsContent={settingsContent} settingsTitle="Settings" onRemove={onRemove}>
      {target ? (
        <>
          <div className="flex-1 flex flex-col justify-center min-w-0">
            {/* Event/countdown title — clamped to one line */}
            <div className="flex items-center gap-1.5 mb-1 min-w-0">
              {target.auto && (
                <span className="text-[9px] shrink-0 px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-5)', border: '1px solid var(--w-border)' }}>
                  auto
                </span>
              )}
              <span
                className="text-sm font-medium truncate"
                style={{ color: 'var(--w-ink-3)', minWidth: 0 }}
                title={target.title}
              >
                {target.title}
              </span>
            </div>

            {done ? (
              <div className="flex flex-col gap-1">
                <span className="font-extrabold" style={{ fontSize: '2.5rem', lineHeight: 1, color: 'var(--w-accent)' }}>🎉</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--w-accent)' }}>Complete!</span>
              </div>
            ) : days > 0 ? (
              <div className="flex items-end gap-2">
                <span className="font-extrabold" style={{ fontSize: 'clamp(3rem,5vw,4.5rem)', lineHeight: 1, color: 'var(--w-accent)' }}>
                  {days}
                </span>
                <div className="pb-1 flex flex-col">
                  <span className="text-lg font-bold" style={{ color: 'var(--w-ink-1)' }}>days</span>
                  {(hours > 0 || mins > 0) && (
                    <span className="text-xs" style={{ color: 'var(--w-ink-5)' }}>{hours}h {mins}m</span>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-end gap-1.5">
                <span className="font-extrabold" style={{ fontSize: 'clamp(2rem,4vw,3rem)', lineHeight: 1, color: 'var(--w-accent)' }}>
                  {hours > 0 ? `${hours}h` : `${mins}m`}
                </span>
                {hours > 0 && (
                  <span className="text-xl font-bold pb-1" style={{ color: 'var(--w-ink-2)' }}>{mins}m</span>
                )}
              </div>
            )}

            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--w-ink-5)' }}>
                {formatTargetDate(target.nextDate)}
              </span>
              {target.repeat !== 'none' && target.repeat !== 'event' && (
                <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-4)' }}>
                  <ArrowRepeat size={9} />
                  {target.repeat}
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <HourglassSplit size={28} style={{ color: 'var(--w-ink-6, var(--w-ink-5))' }} />
          <p className="w-muted text-sm">No countdowns yet.</p>
          <p className="text-xs" style={{ color: 'var(--w-ink-5)' }}>Add events or open settings to create one.</p>
        </div>
      )}
    </BaseWidget>
  );
};

