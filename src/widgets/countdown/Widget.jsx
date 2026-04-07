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
// PINNED_KEY is scoped per-instance so multiple countdown widgets can each pin a different event.
const pinnedKey = (id) => `countdown_pinned_${id}`;

const loadCustom = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
};
const saveCustom = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
const loadPinned = (id) => {
  try { return JSON.parse(localStorage.getItem(pinnedKey(id)) || 'null'); }
  catch { return null; }
};
const savePinned = (id, p) => localStorage.setItem(pinnedKey(id), JSON.stringify(p));

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
      {/* ── From Events ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <CalendarEvent size={10} style={{ color: 'var(--w-accent)' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--w-ink-5)' }}>From Events</span>
        </div>

        {upcomingEvents.length === 0 ? (
          <p className="text-xs py-2" style={{ color: 'var(--w-ink-5)' }}>No upcoming events. Add some in the Events widget.</p>
        ) : (
          <div className="flex flex-col">
            {upcomingEvents.slice(0, 8).map(ev => {
              const isPinned = pinned?.type === 'event' && pinned?.eventId === ev.id;
              return (
                <button
                  key={ev.id}
                  onClick={() => { onPin({ type: 'event', eventId: ev.id }); onClose?.(); }}
                  className="w-full text-left py-2 px-2 rounded-xl transition-colors cursor-pointer group"
                  style={isPinned ? { backgroundColor: 'color-mix(in srgb, var(--w-accent) 12%, transparent)' } : {}}
                >
                  {isPinned && (
                    <div
                      className="flex items-center gap-1.5 mb-1"
                      style={{ color: 'var(--w-accent)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                    >
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor"><path d="M5 0L6.2 3.8H10L6.9 6.2 8.1 10 5 7.6 1.9 10 3.1 6.2 0 3.8H3.8Z" /></svg>
                      Pinned
                    </div>
                  )}
                  <div style={{ pointerEvents: 'none' }}>
                    <EventRow event={ev} showMeet={false} showPrefix />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mb-6" style={{ height: '1px', backgroundColor: 'var(--w-border)' }} />

      {/* ── Custom Countdowns ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <HourglassSplit size={10} style={{ color: 'var(--w-accent)' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--w-ink-5)' }}>Custom</span>
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
          <p className="text-xs py-1" style={{ color: 'var(--w-ink-5)' }}>No custom countdowns yet.</p>
        ) : (
          <div className="flex flex-col">
            {custom.map(cd => {
              const next = getNextOccurrence(cd);
              const { days, hours, minutes: mins } = formatCountdown(next);
              const isPinned = pinned?.type === 'custom' && pinned?.id === cd.id;
              const isPast = next < new Date() && cd.repeat === 'none';

              // Format sub-meta like EventRow
              const cdLabel = isPast ? 'Past' : days > 0 ? `${days}d` : hours > 0 ? `${hours}h` : `${mins}m`;
              const cdDate = formatTargetDate(next);

              return (
                <div
                  key={cd.id}
                  className="flex items-stretch gap-3 py-2 px-2 rounded-xl group"
                  style={{
                    opacity: isPast ? 0.45 : 1,
                    ...(isPinned ? { backgroundColor: 'color-mix(in srgb, var(--w-accent) 12%, transparent)' } : {}),
                  }}
                >
                  {/* Accent bar (matches EventRow) */}
                  <div
                    className="w-[6px] rounded-[2px] shrink-0 self-stretch"
                    style={{ backgroundColor: 'var(--w-accent)', minHeight: '38px' }}
                  />

                  {/* Content */}
                  <button
                    className="flex-1 min-w-0 text-left flex flex-col justify-center gap-0.5"
                    onClick={() => { onPin({ type: 'custom', id: cd.id }); onClose?.(); }}
                  >
                    {isPinned && (
                      <div
                        className="flex items-center gap-1"
                        style={{ color: 'var(--w-accent)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                      >
                        <svg width="7" height="7" viewBox="0 0 10 10" fill="currentColor"><path d="M5 0L6.2 3.8H10L6.9 6.2 8.1 10 5 7.6 1.9 10 3.1 6.2 0 3.8H3.8Z" /></svg>
                        Pinned
                      </div>
                    )}
                    <p className="text-[13px] font-semibold leading-snug truncate" style={{ color: 'var(--w-ink-1)' }}>
                      {cd.title}
                    </p>
                    <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--w-ink-4)' }}>
                      <span style={{ color: 'var(--w-accent)', fontWeight: 600 }}>{cdLabel}</span>
                      <span>·</span>
                      <span>{cdDate}</span>
                      {cd.repeat !== 'none' && (
                        <><span>·</span><span>{cd.repeat}</span></>
                      )}
                    </div>
                  </button>

                  {/* Trash — visible on hover, bigger */}
                  <button
                    onClick={() => onRemoveCustom(cd.id)}
                    className="w-7 h-7 flex items-center justify-center self-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 cursor-pointer shrink-0"
                    style={{ color: 'var(--w-ink-4)' }}
                    aria-label={`Remove ${cd.title}`}
                  >
                    <Trash3 size={15} strokeWidth={1.5} />
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
export const Widget = ({ id, onRemove }) => {
  const [custom, setCustom] = useState(loadCustom);
  const [pinned, setPinnedState] = useState(() => loadPinned(id));
  const [, setTick] = useState(0);

  const [localEvents, addEventToStore, removeEventFromStore] = useEvents();
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
    savePinned(id, p);
  }, [id]);

  const addCustom = useCallback((cd) => {
    setCustom(prev => { const next = [...prev, cd]; saveCustom(next); return next; });
    // Mirror to widget_events so it appears in the Events widget
    addEventToStore({
      id: cd.id,
      title: cd.title,
      startDate: cd.targetDate,
      startTime: cd.targetTime || '',
      endDate: cd.targetDate,
      endTime: '',
      _fromCountdown: true,
    });
  }, [addEventToStore]);

  const removeCustom = useCallback((id) => {
    setCustom(prev => { const next = prev.filter(c => c.id !== id); saveCustom(next); return next; });
    setPinnedState(p => {
      if (p?.type === 'custom' && p?.id === id) { savePinned(null); return null; }
      return p;
    });
    // Remove the mirror from widget_events
    removeEventFromStore(id);
  }, [removeEventFromStore]);

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

  // ── When current event hits zero, advance display to the next upcoming ───────
  const activeTarget = (() => {
    if (!target || totalSeconds >= 60) return target;
    const now = new Date();
    const nextEv = upcomingEvents.find(e =>
      e.id !== target.id &&
      new Date(`${e.startDate || today}T${e.startTime || '00:00'}`) > now
    );
    if (nextEv) return {
      title: nextEv.title,
      nextDate: new Date(`${nextEv.startDate}T${nextEv.startTime || '00:00'}`),
      startTime: nextEv.startTime,
      endTime: nextEv.endTime,
      isEvent: true,
      isGcal: nextEv._source === 'gcal',
      id: nextEv.id,
    };
    const sorted = custom
      .map(cd => ({ ...cd, _next: getNextOccurrence(cd) }))
      .filter(cd => cd._next > now && cd.id !== target.id)
      .sort((a, b) => a._next - b._next);
    if (sorted[0]) return {
      title: sorted[0].title,
      nextDate: sorted[0]._next,
      startTime: sorted[0].targetTime,
      isEvent: false,
      isGcal: false,
      id: sorted[0].id,
      repeat: sorted[0].repeat,
    };
    return null;
  })();

  const { days: aDays = 0, hours: aHours = 0, minutes: aMins = 0 } =
    activeTarget ? formatCountdown(activeTarget.nextDate) : {};

  // ── Human-readable countdown value ─────────────────────────────────────────
  const countdownValue = () => {
    if (aDays > 0) return { main: String(aDays), unit: aDays === 1 ? 'day' : 'days' };
    if (aHours > 0) return { main: String(aHours), unit: aHours === 1 ? 'hr' : 'hrs' };
    if (aMins > 0) return { main: String(aMins), unit: 'min' };
    return { main: null, unit: null };
  };

  const cv = countdownValue();

  const fmtTime = (t) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const durStr = (() => {
    if (!activeTarget?.startTime || !activeTarget?.endTime) return null;
    const [sh, sm] = activeTarget.startTime.split(':').map(Number);
    const [eh, em] = activeTarget.endTime.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) return null;
    if (diff < 60) return `${diff}min`;
    const h = Math.floor(diff / 60), m = diff % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  })();

  // Start time only — "3:15 PM"
  const startTimeStr = activeTarget?.startTime ? fmtTime(activeTarget.startTime) : null;

  // Dynamic title font size
  const titleLen = activeTarget?.title?.length ?? 0;
  const titleFontSize = (() => {
    if (titleLen <= 12) return 'clamp(1.05rem, 2.4vw, 1.4rem)';
    if (titleLen <= 22) return 'clamp(0.9rem, 2vw, 1.15rem)';
    if (titleLen <= 36) return 'clamp(0.8rem, 1.75vw, 1rem)';
    return 'clamp(0.7rem, 1.5vw, 0.88rem)';
  })();

  return (
    <BaseWidget className="p-4 flex flex-col" settingsContent={settingsContent} settingsTitle="Settings" modalWidth="w-[26rem]" onRemove={onRemove}>
      {activeTarget ? (
        <div className="flex-1 flex flex-row items-center gap-0 min-w-0 overflow-hidden">

          {/* Left: big number + unit */}
          <div className="flex flex-col items-center justify-center shrink-0 pr-4" style={{ minWidth: 0 }}>
            {cv.main ? (
              <>
                <span
                  className="font-black leading-none"
                  style={{ fontSize: 'clamp(2.8rem, 6vw, 4.4rem)', color: 'var(--w-accent)', letterSpacing: '-0.04em', lineHeight: 1 }}
                >
                  {cv.main}
                </span>
                <span
                  className="font-bold mt-0.5"
                  style={{ fontSize: 'clamp(0.9rem, 2vw, 1.15rem)', color: 'var(--w-ink-2)', letterSpacing: '-0.01em' }}
                >
                  {cv.unit}
                </span>
              </>
            ) : (
              <span
                className="font-black leading-none"
                style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)', color: 'var(--w-accent)', letterSpacing: '-0.03em' }}
              >
                &lt;1m
              </span>
            )}
          </div>

          {/* Divider — not full height, centered */}
          <div className="shrink-0 my-auto" style={{ width: '1px', height: '65%', backgroundColor: 'var(--w-border)' }} />

          {/* Right: title + time */}
          <div className="flex-1 flex flex-col justify-center gap-2 pl-4 min-w-0 overflow-hidden">
            {/* Title — 4-line clamp, clean truncation */}
            <p
              style={{
                fontSize: titleFontSize,
                fontWeight: 700,
                color: 'var(--w-ink-1)',
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                overflowWrap: 'break-word',
              }}
            >
              {activeTarget.title}
            </p>

            {/* Start time · duration + repeat badge on same line */}
            {(startTimeStr || (activeTarget.repeat && activeTarget.repeat !== 'none' && activeTarget.repeat !== 'event')) && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {startTimeStr && (
                  <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--w-ink-3)', lineHeight: 1, letterSpacing: '-0.01em' }}>
                    {startTimeStr}
                    {durStr && <span style={{ color: 'var(--w-ink-5)' }}> · {durStr}</span>}
                  </p>
                )}
                {activeTarget.repeat && activeTarget.repeat !== 'none' && activeTarget.repeat !== 'event' && (
                  <span
                    className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-4)' }}
                  >
                    <ArrowRepeat size={8} />{activeTarget.repeat}
                  </span>
                )}
              </div>
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

