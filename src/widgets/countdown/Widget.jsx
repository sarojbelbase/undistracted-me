import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { PlusLg, XLg, Trash3, HourglassSplit, ArrowRepeat, CalendarEvent } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useEvents, useGoogleCalendar } from '../useEvents';
import { todayStr } from '../../utilities';
import { PillButton } from '../../components/ui/PillButton';
import { EventRow } from '../../components/ui/EventRow';
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

// ─── Notification helpers ────────────────────────────────────────────────────
// Stores notified event keys in localStorage keyed by today's date so each
// event only fires ONE notification per calendar day, across all new tabs.
const todayKey = () => new Date().toISOString().slice(0, 10);
const wasNotified = (id) => {
  try {
    const map = JSON.parse(localStorage.getItem('cd_notified') || '{}');
    return map[id] === todayKey();
  } catch { return false; }
};
const markNotified = (id) => {
  try {
    const map = JSON.parse(localStorage.getItem('cd_notified') || '{}');
    // Prune old dates
    Object.keys(map).forEach(k => { if (map[k] !== todayKey()) delete map[k]; });
    map[id] = todayKey();
    localStorage.setItem('cd_notified', JSON.stringify(map));
  } catch { }
};

const sendNotification = (title, body) => {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'COUNTDOWN_DONE', title, body });
  } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon/lotus32.png' });
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
      {/* Section: From Events */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarEvent size={11} style={{ color: 'var(--w-accent)' }} />
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
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all hover:opacity-90"
                  style={isPinned
                    ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                    : { backgroundColor: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }
                  }
                >
                  {isPinned ? (
                    <div className="flex items-center gap-2">
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="currentColor" className="shrink-0"><path d="M5 0L6.2 3.8H10L6.9 6.2 8.1 10 5 7.6 1.9 10 3.1 6.2 0 3.8H3.8Z" /></svg>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{ev.title}</div>
                        <div className="text-[10px] opacity-70 mt-0.5">{ev.startDate}{ev.startTime ? ` · ${ev.startTime}` : ''}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ pointerEvents: 'none' }}>
                      <EventRow event={ev} showMeet={false} showPrefix />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mb-5" style={{ height: '1px', backgroundColor: 'var(--w-border)' }} />

      {/* Section: Custom */}
      <div>
        <div className="flex items-center justify-between mb-3">
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
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={isPinned
                    ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                    : { backgroundColor: 'var(--w-surface-2)', border: '1px solid var(--w-border)', opacity: isPast ? 0.5 : 1 }
                  }
                >
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => { onPin({ type: 'custom', id: cd.id }); onClose?.(); }}
                  >
                    <div className="text-xs font-semibold truncate" style={{ color: isPinned ? 'var(--w-accent-fg)' : 'var(--w-ink-1)' }}>{cd.title}</div>
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

  const [localEvents] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  const today = todayStr();
  const allEvents = [...localEvents, ...(gcalEvents || [])];

  // Only show events that haven't started yet (or started < 2 min ago)
  const upcomingEvents = allEvents
    .filter(e => {
      const dt = new Date(`${e.startDate || today}T${e.startTime || '00:00'}`);
      return dt >= new Date(Date.now() - 2 * 60 * 1000);
    })
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

  // ── Resolve target ──────────────────────────────────────────────────────────
  // target shape: { title, nextDate, startTime?, isEvent, isGcal, id, repeat? }
  let target = null;

  if (pinned?.type === 'event') {
    // Search both local AND gcal events for the pinned id
    const ev = allEvents.find(e => e.id === pinned.eventId);
    if (ev) {
      const nextDate = new Date(`${ev.startDate}T${ev.startTime || '00:00'}`);
      // Only keep pinned event if it hasn't started yet (or within 2 min grace)
      if (nextDate >= new Date(Date.now() - 2 * 60 * 1000)) {
        target = { title: ev.title, nextDate, startTime: ev.startTime, endTime: ev.endTime, isEvent: true, isGcal: ev._source === 'gcal', id: ev.id };
      } else {
        // Past its grace window — silently clear pin
        setTimeout(() => setPin(null), 0);
      }
    }
  } else if (pinned?.type === 'custom') {
    const cd = custom.find(c => c.id === pinned.id);
    if (cd) {
      target = { title: cd.title, nextDate: getNextOccurrence(cd), startTime: cd.targetTime, isEvent: false, isGcal: false, id: cd.id, repeat: cd.repeat };
    }
  }

  // Fallback: auto-pick the next future event
  if (!target) {
    const now = new Date();
    const nextEv = upcomingEvents.find(e => {
      const dt = new Date(`${e.startDate || today}T${e.startTime || '00:00'}`);
      return dt > now;
    });
    if (nextEv) {
      target = {
        title: nextEv.title,
        nextDate: new Date(`${nextEv.startDate}T${nextEv.startTime || '00:00'}`),
        startTime: nextEv.startTime,
        endTime: nextEv.endTime,
        isEvent: true,
        isGcal: nextEv._source === 'gcal',
        id: nextEv.id,
      };
    }
  }

  // Fallback: auto-pick nearest future custom countdown
  if (!target && custom.length > 0) {
    const now = new Date();
    const sorted = custom
      .map(cd => ({ ...cd, _next: getNextOccurrence(cd) }))
      .filter(cd => cd._next > now)
      .sort((a, b) => a._next - b._next);
    if (sorted.length > 0) {
      const cd = sorted[0];
      target = { title: cd.title, nextDate: cd._next, startTime: cd.targetTime, isEvent: false, isGcal: false, id: cd.id, repeat: cd.repeat };
    }
  }

  // ── Notifications: fire once per event per day ──────────────────────────────
  const { days = 0, hours = 0, minutes: mins = 0, totalSeconds = 0 } = target ? formatCountdown(target.nextDate) : {};
  const notifKey = target ? `${target.id ?? target.title}` : null;

  useEffect(() => {
    if (!notifKey || totalSeconds > 0) return;
    if (wasNotified(notifKey)) return;
    markNotified(notifKey);

    if (target.isEvent) {
      sendNotification(target.title, target.isGcal ? 'Google Calendar event is starting' : 'Event is starting');
    } else {
      sendNotification('Countdown complete', target.title);
    }

    // Auto-clear pinned custom (once) so we advance to next
    if (pinned?.type === 'custom') {
      const cd = custom.find(c => c.id === pinned.id);
      if (cd?.repeat === 'none') setTimeout(() => setPin(null), 10_000);
    }
    // Auto-clear pinned event so we advance to next
    if (pinned?.type === 'event') {
      setTimeout(() => setPin(null), 10_000);
    }
  }, [notifKey, totalSeconds === 0]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Human-readable countdown value ─────────────────────────────────────────
  const countdownValue = () => {
    if (totalSeconds === 0) return { main: 'now', unit: null, sub: null };
    if (days > 0) return {
      main: String(days),
      unit: days === 1 ? 'day' : 'days',
      sub: (hours > 0 || mins > 0) ? `${hours}h ${mins}m` : null,
    };
    if (hours > 0) return { main: String(hours), unit: `h ${mins}m`, sub: null };
    return { main: String(mins), unit: 'min', sub: null };
  };

  const cv = countdownValue();

  // Format target time nicely
  const fmtTime = (t) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  // Duration string from startTime + endTime
  const durStr = (() => {
    if (!target?.startTime || !target?.endTime) return null;
    const [sh, sm] = target.startTime.split(':').map(Number);
    const [eh, em] = target.endTime.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) return null;
    if (diff < 60) return `${diff}min`;
    const h = Math.floor(diff / 60), m = diff % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  })();
  const titleShort = !target || target.title.length <= 28;

  return (
    <BaseWidget className="p-4 flex flex-col" settingsContent={settingsContent} settingsTitle="Countdown" onRemove={onRemove}>
      {target ? (
        <div className="flex-1 flex flex-col justify-center gap-2 min-w-0 overflow-hidden">

          {/* Event title — wraps to 2 lines */}
          <p
            className="text-[13px] font-semibold leading-snug"
            style={{ color: 'var(--w-ink-2)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            title={target.title}
          >
            {target.title}
          </p>

          {/* "is in N unit" — all inline */}
          <div className="flex items-baseline gap-1.5 flex-wrap mt-0.5">
            <span
              className="font-medium"
              style={{ fontSize: titleShort ? '13px' : '11px', color: 'var(--w-ink-5)' }}
            >
              {totalSeconds === 0 ? 'is starting' : 'is in'}
            </span>
            {totalSeconds > 0 && (
              <>
                <span
                  className="font-extrabold leading-none"
                  style={{ fontSize: titleShort ? 'clamp(2.8rem,6.5vw,4.5rem)' : 'clamp(2.2rem,5vw,3.8rem)', color: 'var(--w-accent)', lineHeight: 1 }}
                >
                  {cv.main}
                </span>
                <span
                  className="font-bold"
                  style={{ fontSize: titleShort ? 'clamp(1.4rem,3vw,2rem)' : 'clamp(1.1rem,2.5vw,1.6rem)', color: 'var(--w-ink-2)', lineHeight: 1 }}
                >
                  {cv.unit}
                </span>
              </>
            )}
          </div>

          {/* Sub-time (e.g. "4h 20m" under days) */}
          {cv.sub && (
            <p className="text-[11px] font-medium" style={{ color: 'var(--w-ink-5)' }}>{cv.sub}</p>
          )}

          {/* Time · duration meta (semibold) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(target.startTime || durStr) && (
              <span className="text-[11px] font-semibold" style={{ color: 'var(--w-ink-5)' }}>
                {[target.startTime ? fmtTime(target.startTime) : null, durStr].filter(Boolean).join(' · ')}
              </span>
            )}
            {target.repeat && target.repeat !== 'none' && target.repeat !== 'event' && (
              <span
                className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-4)' }}
              >
                <ArrowRepeat size={9} />{target.repeat}
              </span>
            )}
          </div>

        </div>
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

