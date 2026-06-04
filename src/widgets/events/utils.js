/**
 * Events widget utilities
 */
import { todayStr, toLocalDateStr } from '../../utilities';
import { humanizeTime } from '../../utilities/humanizeTime';

/** Returns true if an event is in the past */
export const isPast = (event) => {
  const now = new Date();
  if (event.endDate && event.endTime) {
    return new Date(`${event.endDate}T${event.endTime}`) < now;
  }
  if (event.startDate && event.startTime) {
    return new Date(`${event.startDate}T${event.startTime}`) < now;
  }
  if (event.startDate) {
    return event.startDate < todayStr();
  }
  return false;
};

/** Date string offset from today in local time (offset=1 → tomorrow) */
export const getDateOffset = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return toLocalDateStr(d);
};

/**
 * Bucket label for a given date string.
 * @returns {'Today'|'Tomorrow'|'Later'|'Past'}
 */
export const bucketLabel = (dateStr) => {
  if (!dateStr) return 'Past';
  const h = humanizeTime(dateStr);
  if (h.isToday) return 'Today';
  if (h.isTomorrow) return 'Tomorrow';
  return h.direction === 'future' ? 'Later' : 'Past';
};

/**
 * Groups an array of events into { Today, Tomorrow, Later, Past }.
 */
export const groupEventsByBucket = (events) => {
  const buckets = { Today: [], Tomorrow: [], Later: [], Past: [] };
  events.forEach((e) => { buckets[bucketLabel(e.startDate)].push(e); });
  return buckets;
};

// ─── Age label ───────────────────────────────────────────────────────────────
// Sourced from utilities/index.js — single canonical implementation.
export { humanizeAge } from '../../utilities';

// ─── Layout constants ────────────────────────────────────────────────────────

export const ITEM_HEIGHT = 57;
export const HEADER_H = 40;
export const FOOTER_H = 52;

// ─── Form constants ──────────────────────────────────────────────────────────

export const EMPTY_FORM = { title: '', startDate: '', startTime: '', endDate: '', endTime: '' };

export const DATE_CHIPS = [
  { label: 'Today', key: 'today', offset: 0 },
  { label: 'Tomorrow', key: 'tomorrow', offset: 1 },
  { label: 'Custom', key: 'custom', offset: null },
];

export const DURATION_PILLS = [
  { label: '30 min', mins: 30 },
  { label: '1 hr', mins: 60 },
  { label: '2 hr', mins: 120 },
  { label: 'Custom', mins: null },
];

// ─── Form helpers ────────────────────────────────────────────────────────────

/**
 * Applies a duration (minutes) to a start datetime and returns the end datetime.
 */
export const applyDuration = (startDate, startTime, mins) => {
  if (!startDate || !startTime) return { endDate: startDate || '', endTime: '' };
  const d = new Date(`${startDate}T${startTime}`);
  d.setMinutes(d.getMinutes() + mins);
  return {
    endDate: toLocalDateStr(d),
    endTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
};

// ─── Display formatters (shared by Widget + AllEventsModal) ──────────────────

/** "8:15 AM" from a 24-hour HH:MM string */
export const fmt12 = (time) => {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

/** "45 min" / "1h 30m" from start+end HH:MM; null if multi-day or indeterminate */
export const calcDuration = (startTime, endTime, startDate, endDate) => {
  if (!startTime || !endTime) return null;
  if (endDate && startDate && endDate !== startDate) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0 || diff > 1440) return null;
  if (diff < 60) return `${diff} min`;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

/** Today → null; Tomorrow → 'Tomorrow'; else 'Fri, Apr 3' */
export const datePrefixFor = (dateStr) => {
  if (!dateStr) return null;
  const h = humanizeTime(dateStr);
  if (h.isToday) return null;
  if (h.isTomorrow) return 'Tomorrow';
  return h.calendar;
};

/**
 * Returns true if an event is currently in progress (started but not yet ended).
 */
export const isLiveNow = (event) => {
  const now = new Date();
  const today = todayStr();
  const eDate = event.startDate || today;
  if (eDate !== today) return false;
  if (!event.startTime) return false;
  const start = new Date(`${eDate}T${event.startTime}`);
  if (now < start) return false;
  if (event.endTime) {
    const end = new Date(`${event.endDate || eDate}T${event.endTime}`);
    return now < end;
  }
  // No end time — treat the event as live for 30 min after start
  return (now - start) < 30 * 60 * 1000;
};

// ─── Focus Mode / Canvas shared event pickers ─────────────────────────────────

/**
 * Returns the next event to show: the currently active one or the nearest
 * upcoming one. Returns null when there are no relevant events.
 */
export const getNextEventToShow = (events) => {
  const now = new Date();
  const active = events.find(e => {
    if (!e.startDate || !e.endDate || !e.startTime || !e.endTime) return false;
    const start = new Date(`${e.startDate}T${e.startTime}`);
    const end = new Date(`${e.endDate}T${e.endTime}`);
    return now >= start && now <= end;
  });
  if (active) return { event: active, isActive: true };

  const upcoming = events
    .filter(e => {
      if (!e.startDate || !e.startTime) return false;
      return new Date(`${e.startDate}T${e.startTime}`) > now;
    })
    .sort((a, b) =>
      new Date(`${a.startDate}T${a.startTime}`) - new Date(`${b.startDate}T${b.startTime}`)
    );
  if (upcoming.length > 0) return { event: upcoming[0], isActive: false };
  return null;
};

/**
 * Returns a human-readable "time until" string for an upcoming event,
 * e.g. "in 5m", "in 1h 30m", "Tomorrow".
 */
export const getTimeUntilEvent = (event) => {
  const start = new Date(`${event.startDate}T${event.startTime}`);
  if (start <= Date.now()) return 'now';
  const h = humanizeTime(start, { now: Date.now() });
  return h.compact === '<1m' ? 'now' : h.full;
};

/**
 * Formats an event's startTime as a 12-hour clock string, e.g. "9:30 AM".
 */
export const formatEventStartTime = (event) => {
  if (!event.startTime) return '';
  const [h, min] = event.startTime.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
};
