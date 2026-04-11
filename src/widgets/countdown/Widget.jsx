import React, { useState, useEffect, useCallback, useReducer } from 'react';
import { PlusLg, XLg, Trash3, HourglassSplit, ArrowRepeat, CalendarEvent } from 'react-bootstrap-icons';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { TintedChip } from '../../components/ui/TintedChip';
import { SegmentedDateTime } from '../../components/ui/SegmentedDateTime';
import { Modal } from '../../components/ui/Modal';
import { BaseWidget } from '../BaseWidget';
import { useEvents, useGoogleCalendar } from '../useEvents';
import { todayStr } from '../../utilities';
import { EventRow } from '../../components/ui/EventRow';
import { useSettingsStore } from '../../store';
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
  const { cardStyle } = useSettingsStore();
  const isGlass = cardStyle === 'glass';
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [repeat, setRepeat] = useState('none');

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const valid = title.trim() && date;

  const handleSave = () => {
    if (!valid) return;
    onSave({ id: makeId(), title: title.trim(), targetDate: date, targetTime: time, repeat });
    onClose();
  };

  return (
    <Modal onClose={onClose} className="w-80">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--card-border)' }}>
        <span className="font-semibold text-sm" style={{ color: 'var(--w-ink-1)' }}>New Countdown</span>
        <button onClick={onClose} className="w-6 h-6 rounded-full flex items-center justify-center transition-colors btn-close cursor-pointer" style={{ color: 'var(--w-ink-3)' }}>
          <XLg size={12} />
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4">
        <SettingsInput
          autoFocus
          type="text"
          placeholder="What are you counting down to?"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
        />

        <div>
          <div className="text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--w-ink-3)' }}>When</div>
          <SegmentedDateTime mode="datetime" date={date} onDateChange={setDate} time={time} onTimeChange={setTime} />
        </div>

        <div>
          <div className="text-[10px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: 'var(--w-ink-3)' }}>Repeat</div>
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: isGlass ? 'rgba(255,255,255,0.45)' : 'var(--w-surface-2)', border: isGlass ? '1px solid rgba(0,0,0,0.09)' : '1px solid var(--w-border)' }}>
            {REPEAT_OPTIONS.map(r => {
              const active = repeat === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => setRepeat(r.value)}
                  className="flex-1 rounded-lg text-xs font-semibold py-1.5 transition-all cursor-pointer"
                  style={active
                    ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)', border: 'none', outline: 'none' }
                    : { background: 'transparent', color: 'var(--w-ink-3)', border: 'none', outline: 'none' }}
                >{r.label}</button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 px-4 pb-4">
        <button onClick={onClose} className="px-4 py-1.5 text-sm rounded-xl hover:opacity-70 cursor-pointer" style={{ background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', color: 'var(--w-ink-2)' }}>Cancel</button>
        <button onClick={handleSave} disabled={!valid}
          className="px-4 py-1.5 text-sm rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
          style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
        >Save</button>
      </div>
    </Modal>
  );
};
const CountdownSettings = ({ custom, pinned, upcomingEvents, onAddCustom, onRemoveCustom, onPin, onClose }) => {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      {/* ── Custom Countdowns ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-5.5 h-5.5 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'color-mix(in srgb, var(--w-accent) 13%, transparent)' }}
            >
              <HourglassSplit size={11} style={{ color: 'var(--w-accent)' }} />
            </div>
            <span className="text-[12px] font-bold" style={{ color: 'var(--w-ink-1)', letterSpacing: '-0.01em' }}>My Countdowns</span>
          </div>
          <TintedChip size="sm" onClick={() => setShowAdd(true)} className="flex items-center gap-1">
            <PlusLg size={9} />
            New
          </TintedChip>
        </div>

        {custom.length === 0 ? (
          <div
            className="rounded-2xl flex flex-col items-center text-center py-7 px-5"
            style={{ background: 'var(--w-surface-2)', border: '1.5px dashed var(--w-border)' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: 'color-mix(in srgb, var(--w-accent) 10%, transparent)' }}
            >
              <HourglassSplit size={22} style={{ color: 'var(--w-accent)', opacity: 0.75 }} />
            </div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--w-ink-1)' }}>Nothing to count down to</p>
            <p className="text-[11.5px] leading-relaxed mb-4" style={{ color: 'var(--w-ink-5)', maxWidth: '180px' }}>
              Track birthdays, trips, launches — anything that matters.
            </p>
            <TintedChip size="sm" onClick={() => setShowAdd(true)} className="flex items-center gap-1.5">
              <PlusLg size={9} />
              Add your first countdown
            </TintedChip>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {custom.map(cd => {
              const next = getNextOccurrence(cd);
              const { days, hours, minutes: mins } = formatCountdown(next);
              const isPinned = pinned?.type === 'custom' && pinned?.id === cd.id;
              const isPast = next < new Date() && cd.repeat === 'none';

              const cdLabel = (() => {
                if (isPast) return 'Past';
                if (days > 0) return `${days}d`;
                if (hours > 0) return `${hours}h`;
                return `${mins}m`;
              })();
              const cdDate = formatTargetDate(next);

              return (
                <div
                  key={cd.id}
                  className="flex items-center rounded-xl group transition-all"
                  style={{
                    opacity: isPast ? 0.4 : 1,
                    background: isPinned
                      ? 'color-mix(in srgb, var(--w-accent) 9%, transparent)'
                      : 'transparent',
                    border: isPinned
                      ? '1px solid color-mix(in srgb, var(--w-accent) 22%, transparent)'
                      : '1px solid transparent',
                  }}
                >
                  {/* Left accent bar */}
                  <div
                    className="w-0.75 rounded-full self-stretch shrink-0 mx-2 my-2"
                    style={{
                      background: isPinned ? 'var(--w-accent)' : 'rgba(0,0,0,0.15)',
                      minHeight: '32px',
                      transition: 'background 0.15s',
                    }}
                  />

                  {/* Main clickable content */}
                  <button
                    className="flex-1 min-w-0 text-left flex items-center justify-between gap-2 py-2 pr-1"
                    onClick={() => { onPin({ type: 'custom', id: cd.id }); onClose?.(); }}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
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
                      <div className="flex items-center gap-1" style={{ color: 'var(--w-ink-5)', fontSize: '11px' }}>
                        <span>{cdDate}</span>
                        {cd.repeat !== 'none' && (
                          <>
                            <span style={{ color: 'var(--w-ink-6)' }}>·</span>
                            <ArrowRepeat size={9} />
                            <span>{cd.repeat}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Countdown value badge */}
                    <span
                      className="text-[13px] font-bold shrink-0 tabular-nums"
                      style={{ color: isPast ? 'var(--w-ink-5)' : 'var(--w-accent)' }}
                    >
                      {cdLabel}
                    </span>
                  </button>

                  {/* Trash */}
                  <button
                    onClick={() => onRemoveCustom(cd.id)}
                    className="w-7 h-7 flex items-center justify-center self-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 cursor-pointer shrink-0 mr-1.5"
                    style={{ color: 'var(--w-ink-4)' }}
                    aria-label={`Remove ${cd.title}`}
                  >
                    <Trash3 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mb-4" style={{ height: '1px', background: 'rgba(0,0,0,0.09)' }} />

      {/* ── From Calendar Events ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-5.5 h-5.5 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in srgb, var(--w-accent) 13%, transparent)' }}
          >
            <CalendarEvent size={11} style={{ color: 'var(--w-accent)' }} />
          </div>
          <span className="text-[12px] font-bold" style={{ color: 'var(--w-ink-1)', letterSpacing: '-0.01em' }}>From Calendar</span>
        </div>

        {upcomingEvents.length === 0 ? (
          <div
            className="rounded-2xl flex flex-col items-center text-center py-6 px-5"
            style={{ background: 'var(--w-surface-2)', border: '1.5px dashed var(--w-border)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-2.5"
              style={{ background: 'color-mix(in srgb, var(--w-accent) 10%, transparent)' }}
            >
              <CalendarEvent size={18} style={{ color: 'var(--w-accent)', opacity: 0.75 }} />
            </div>
            <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--w-ink-1)' }}>No upcoming events</p>
            <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--w-ink-5)', maxWidth: '180px' }}>
              Add events in the Events widget and pin them here as countdowns.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {upcomingEvents.slice(0, 8).map(ev => {
              const isPinned = pinned?.type === 'event' && pinned?.eventId === ev.id;
              const evDate = new Date(`${ev.startDate}T${ev.startTime || '00:00'}`);
              const { days: evDays, hours: evHours, minutes: evMins } = formatCountdown(evDate);
              const evLabel = (() => {
                if (evDays > 0) return `${evDays}d`;
                if (evHours > 0) return `${evHours}h`;
                return `${evMins}m`;
              })();

              return (
                <div
                  key={ev.id}
                  className="flex items-center rounded-xl group transition-all"
                  style={{
                    background: isPinned
                      ? 'color-mix(in srgb, var(--w-accent) 9%, transparent)'
                      : 'transparent',
                    border: isPinned
                      ? '1px solid color-mix(in srgb, var(--w-accent) 22%, transparent)'
                      : '1px solid transparent',
                  }}
                >
                  <div
                    className="w-0.75 rounded-full self-stretch shrink-0 mx-2 my-2"
                    style={{
                      background: isPinned ? 'var(--w-accent)' : 'rgba(0,0,0,0.15)',
                      minHeight: '32px',
                      transition: 'background 0.15s',
                    }}
                  />
                  <button
                    className="flex-1 min-w-0 text-left py-2 pr-1 flex items-center justify-between gap-2"
                    onClick={() => { onPin({ type: 'event', eventId: ev.id }); onClose?.(); }}
                  >
                    <div className="flex-1 min-w-0">
                      {isPinned && (
                        <div
                          className="flex items-center gap-1 mb-1"
                          style={{ color: 'var(--w-accent)', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}
                        >
                          <svg width="7" height="7" viewBox="0 0 10 10" fill="currentColor"><path d="M5 0L6.2 3.8H10L6.9 6.2 8.1 10 5 7.6 1.9 10 3.1 6.2 0 3.8H3.8Z" /></svg>
                          Pinned
                        </div>
                      )}
                      <div style={{ pointerEvents: 'none' }}>
                        <EventRow event={ev} showMeet={false} showPrefix />
                      </div>
                    </div>
                    <span
                      className="text-[13px] font-bold shrink-0 tabular-nums"
                      style={{ color: 'var(--w-accent)' }}
                    >
                      {evLabel}
                    </span>
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

// ─── Pure helpers (module-level to keep Widget complexity low) ───────────────

// ── Pure countdown value calculation ─────────────────────────────────────────

function monthsTier(days) {
  const months = Math.floor(days / 30);
  const rounded = days % 30 >= 15 ? months + 1 : months;
  return { main: String(rounded), unit: rounded === 1 ? 'mo' : 'mos' };
}

function daysTier(days, hours) {
  const rounded = hours >= 12 ? days + 1 : days;
  if (rounded >= 30) return { main: '1', unit: 'mo' };
  return { main: String(rounded), unit: rounded === 1 ? 'day' : 'days' };
}

function hoursTier(hours, mins) {
  const rounded = mins >= 30 ? hours + 1 : hours;
  if (rounded >= 24) return { main: '1', unit: 'day' };
  return { main: String(rounded), unit: rounded === 1 ? 'hr' : 'hrs' };
}

function minsTier(mins, secs) {
  const rounded = secs >= 30 ? mins + 1 : mins;
  if (rounded >= 60) return { main: '1', unit: 'hr' };
  return { main: String(rounded), unit: 'min' };
}

// Every unit rounds to nearest: e.g. 1d 14h → 2 days, 2h 35m → 3 hrs, 45m 40s → 46 min
function countdownValue(aDays, aHours, aMins, aTotalSecs) {
  const aSecs = aTotalSecs % 60;
  if (aDays >= 30) return monthsTier(aDays);
  if (aDays > 0) return daysTier(aDays, aHours);
  if (aHours > 0) return hoursTier(aHours, aMins);
  if (aMins > 0 || aSecs >= 30) return minsTier(aMins, aSecs);
  return { main: null, unit: null };
}

function getTitleFontSize(titleLen) {
  if (titleLen <= 12) return 'clamp(1.05rem, 2.4vw, 1.4rem)';
  if (titleLen <= 22) return 'clamp(0.9rem, 2vw, 1.15rem)';
  if (titleLen <= 36) return 'clamp(0.8rem, 1.75vw, 1rem)';
  return 'clamp(0.7rem, 1.5vw, 0.88rem)';
}

function resolveActiveTarget(target, totalSeconds, upcomingEvents, today, custom) {
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
}

function calcDurStr(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) return null;
  if (diff < 60) return `${diff}min`;
  const h = Math.floor(diff / 60), m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// Returns { target, shouldClearPin } — shouldClearPin=true if the pinned event is past grace window
function resolveTarget(pinned, allEvents, upcomingEvents, today, custom) {
  if (pinned?.type === 'event') {
    const ev = allEvents.find(e => e.id === pinned.eventId);
    if (ev) {
      const nextDate = new Date(`${ev.startDate}T${ev.startTime || '00:00'}`);
      if (nextDate >= new Date(Date.now() - 2 * 60 * 1000)) {
        return { target: { title: ev.title, nextDate, startTime: ev.startTime, endTime: ev.endTime, isEvent: true, isGcal: ev._source === 'gcal', id: ev.id }, shouldClearPin: false };
      }
      return { target: null, shouldClearPin: true };
    }
  } else if (pinned?.type === 'custom') {
    const cd = custom.find(c => c.id === pinned.id);
    if (cd) {
      return { target: { title: cd.title, nextDate: getNextOccurrence(cd), startTime: cd.targetTime, isEvent: false, isGcal: false, id: cd.id, repeat: cd.repeat }, shouldClearPin: false };
    }
  }

  // Fallback: auto-pick the next future event
  const now = new Date();
  const nextEv = upcomingEvents.find(e => new Date(`${e.startDate || today}T${e.startTime || '00:00'}`) > now);
  if (nextEv) {
    return { target: { title: nextEv.title, nextDate: new Date(`${nextEv.startDate}T${nextEv.startTime || '00:00'}`), startTime: nextEv.startTime, endTime: nextEv.endTime, isEvent: true, isGcal: nextEv._source === 'gcal', id: nextEv.id }, shouldClearPin: false };
  }

  // Fallback: auto-pick nearest future custom countdown
  if (custom.length > 0) {
    const sorted = custom
      .map(cd => ({ ...cd, _next: getNextOccurrence(cd) }))
      .filter(cd => cd._next > now)
      .sort((a, b) => a._next - b._next);
    if (sorted[0]) {
      const cd = sorted[0];
      return { target: { title: cd.title, nextDate: cd._next, startTime: cd.targetTime, isEvent: false, isGcal: false, id: cd.id, repeat: cd.repeat }, shouldClearPin: false };
    }
  }

  return { target: null, shouldClearPin: false };
}

// ─── Main Widget ──────────────────────────────────────────────────────────────
export const Widget = ({ id, onRemove }) => {
  const [custom, setCustom] = useState(loadCustom);
  const [pinned, setPinned] = useState(() => loadPinned(id));
  const [, forceUpdate] = useReducer(n => n + 1, 0);

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
    setPinned(p);
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
    setPinned(p => {
      if (p?.type === 'custom' && p?.id === id) { savePinned(null); return null; }
      return p;
    });
    // Remove the mirror from widget_events
    removeEventFromStore(id);
  }, [removeEventFromStore]);

  // Re-render every second for live countdown
  useEffect(() => {
    const id = setInterval(() => forceUpdate(), 1_000);
    return () => clearInterval(id);
  }, []);

  // ── Resolve target ──────────────────────────────────────────────────────────
  // target shape: { title, nextDate, startTime?, isEvent, isGcal, id, repeat? }
  const { target, shouldClearPin } = resolveTarget(pinned, allEvents, upcomingEvents, today, custom);
  if (shouldClearPin) setTimeout(() => setPin(null), 0);

  // ── Notifications: fire once per event per day ──────────────────────────────
  const { totalSeconds = 0 } = target ? formatCountdown(target.nextDate) : {};
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
  const activeTarget = resolveActiveTarget(target, totalSeconds, upcomingEvents, today, custom);

  const { days: aDays = 0, hours: aHours = 0, minutes: aMins = 0, totalSeconds: aTotalSecs = 0 } =
    activeTarget ? formatCountdown(activeTarget.nextDate) : {};

  // ── Human-readable countdown value ─────────────────────────────────────────
  const cv = countdownValue(aDays, aHours, aMins, aTotalSecs);

  const fmtTime = (t) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const durStr = calcDurStr(activeTarget?.startTime, activeTarget?.endTime);

  // Start time only — "3:15 PM"
  const startTimeStr = activeTarget?.startTime ? fmtTime(activeTarget.startTime) : null;

  // Dynamic title font size
  const titleLen = activeTarget?.title?.length ?? 0;
  const titleFontSize = getTitleFontSize(titleLen);

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
                    {durStr && <span style={{ color: 'var(--w-ink-4)' }}> · {durStr}</span>}
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
          <HourglassSplit size={28} style={{ color: 'var(--w-ink-4)' }} />
          <p className="w-muted text-sm">No countdowns yet.</p>
          <p className="text-xs" style={{ color: 'var(--w-ink-4)' }}>Add events or open settings to create one.</p>
        </div>
      )}
    </BaseWidget>
  );
};

